import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request: Request) {
  try {
    const { courseName, teeColor } = await request.json()
    if (!courseName) return NextResponse.json({ error: 'courseName required' }, { status: 400 })

    const tee = teeColor || 'White'

    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Return the golf course scorecard for "${courseName}" (${tee} tees) as JSON.

Return ONLY valid JSON — no markdown fences, no explanation — in this exact format:
{
  "name": "Full Course Name",
  "location": "City, State",
  "tee_color": "${tee}",
  "holes": [
    {"hole": 1, "par": 4, "hcp": 7, "yards": 380},
    {"hole": 2, "par": 4, "hcp": 3, "yards": 350},
    ...all 18 holes...
  ]
}

Rules:
- hcp values must be integers 1–18, each used exactly once across all 18 holes
- par values are 3, 4, or 5
- yards can be null if unknown but prefer real values
- If you're uncertain about the specific tee yardages, use your best estimate and set yards to null`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const data = JSON.parse(text)

    // Validate structure
    if (!data.holes || data.holes.length !== 18) {
      throw new Error('Expected 18 holes in response')
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('course-lookup error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Lookup failed' },
      { status: 500 },
    )
  }
}
