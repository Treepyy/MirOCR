import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { nodes, edges, accessToken } = await req.json();

    if (!accessToken) {
      return NextResponse.json({ error: 'Missing Auth Token' }, { status: 400 });
    }

    // 1. CREATE A NEW BOARD
    const boardResponse = await fetch('https://api.miro.com/v2/boards', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `MirOCR: ${new Date().toLocaleTimeString()}`,
        policy: {
          permissionsPolicy: {
            collaborationToolsStartMindMap: 'all_editors',
          }
        }
      }),
    });

    const newBoard = await boardResponse.json();
    const boardId = newBoard.id;

    if (!boardId) throw new Error('Failed to create board');

    // 2. CREATE SHAPES
    const nodeMapping: Record<string, string> = {};

    for (const node of nodes) {
      const shapeRes = await fetch(`https://api.miro.com/v2/boards/${boardId}/shapes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            content: node.label,
            shape: node.type === 'database' ? 'cylinder' : 'rectangle', // tbi
          },
          position: {
            x: (node.x * 10) - 500,
            y: (node.y * 10) - 500,
          },
        }),
      });
      const miroShape = await shapeRes.json();
      nodeMapping[node.id] = miroShape.id;

      // 3. TIPS!
      if (node.tip) {
        await fetch(`https://api.miro.com/v2/boards/${boardId}/sticky_notes`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: { content: node.tip },
            position: {
              x: (node.x * 10) - 350, // Offset it to the right of the shape
              y: (node.y * 10) - 550,
            },
          }),
        });
      }
    }

    // 4. CREATE CONNECTORS
    for (const edge of edges) {
      await fetch(`https://api.miro.com/v2/boards/${boardId}/connectors`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startItem: { id: nodeMapping[edge.from] },
          endItem: { id: nodeMapping[edge.to] },
        }),
      });
    }

    return NextResponse.json({ success: true, boardUrl: newBoard.viewLink });

  } catch (error) {
    console.error('Miro Sync Error:', error);
    return NextResponse.json({ error: 'Failed to sync' }, { status: 500 });
  }
}