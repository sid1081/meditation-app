import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/meditation';
let client: MongoClient | null = null;

async function connect() {
  if (!client) {
    client = await MongoClient.connect(uri);
  }
  return client.db();
}

export async function GET() {
  try {
    const db = await connect();
    const sessions = await db.collection('sessions').find().toArray();
    return NextResponse.json(sessions);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch sessions', err }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const db = await connect();

    const sessionData = {
      ...body,
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name,
      createdAt: new Date()
    };

    const result = await db.collection('sessions').insertOne(sessionData);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to add session', err }, { status: 500 });
  }
}
