import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert File to Buffer for Gemini
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
      Analyze this handwritten system architecture diagram. 
      1. Identify all components (e.g., Database, Client, Server, Load Balancer).
      2. For each, provide coordinates (0-1000 scale) and a label.
      3. Identify connections between components.
      4. Provide one 'Best Practice' tip for each.

      Return ONLY a JSON object:
      {
        "nodes": [{"id": "1", "label": "Database", "type": "postgres", "x": 20, "y": 30, "tip": "Enable SSL"}],
        "edges": [{"from": "1", "to": "2"}]
      }
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: file.type,
        },
      },
    ]);

    const response = await result.response;
    console.log('Gemini Raw Response:', response.text());
    const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    
    return NextResponse.json(JSON.parse(text));

  } catch (error) {
    console.error('Gemini Error:', error);
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 });
  }
}