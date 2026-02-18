import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { nodes, edges, accessToken } = await req.json();
    const colorMap: Record<string, string> = {
        cylinder: '#bee9fd', 
        cloud: '#dce0f7',    
        monitor: '#ecb0f6', 
        rhombus: '#b8f4bd', 
    };

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
    const boardDistanceMultiplier = 2;

    for (const node of nodes) {
      const shapeRes = await fetch(`https://api.miro.com/v2/boards/${boardId}/shapes`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            data: {
                content: `<strong>${node.label}</strong>`,
                shape: node.shape || 'rectangle', 
            },
            style: {
                fillColor: colorMap[node.shape] || '#ffffff', 
                borderColor: '#050038',
                borderWidth: '2.0',
                textAlign: 'center',
            },
            position: {
                x: (node.x * boardDistanceMultiplier) - 500,
                y: (node.y * boardDistanceMultiplier) - 500,
            },
        }),
      });
      const miroShape = await shapeRes.json();
      console.log('Created shape:', miroShape, miroShape.context);
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
              x: (node.x * boardDistanceMultiplier) - 350, 
              y: (node.y * boardDistanceMultiplier) - 550,
            },
          }),
        });
      }
    }

    // 4. CREATE CONNECTORS
    for (const edge of edges) {
      const edgeRes = await fetch(`https://api.miro.com/v2/boards/${boardId}/connectors`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startItem: { id: nodeMapping[edge.from] },
          endItem: { id: nodeMapping[edge.to] },
          shape: 'curved', 
          captions: edge.comment ? [{
            content: edge.comment,

          }] : [],
          style: {
            strokeColor: '#050038',
            strokeWidth: '2.0',
          }
        }),
      });
      // const miroConnector = await edgeRes.json();
      // console.log('Created connector:', miroConnector);
      // console.log(miroConnector.context);
    }

    return NextResponse.json({ success: true, boardUrl: newBoard.viewLink });

  } catch (error) {
    console.error('Miro Sync Error:', error);
    return NextResponse.json({ error: 'Failed to sync' }, { status: 500 });
  }
}