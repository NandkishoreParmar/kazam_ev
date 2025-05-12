const express = require("express");
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const { MongoClient } = require('mongodb');
const cors = require("cors");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

const redis = new Redis({
  host: 'redis-12675.c212.ap-south-1-1.ec2.cloud.redislabs.com',
  port: 12675,
  username: 'default',
  password: 'dssYpBnYQrl01GbCGVhVq2e4dYvUrKJB',
});

const mongoUrl = 'mongodb://localhost:27017/assignment';
const client = new MongoClient(mongoUrl);
// const corsOptions = {
//     origin: 'https://notes-app1234556.netlify.app/', // Allow only requests from this origin
//      // Allow only these headers
// };

// Use CORS middleware with specified options
let db;

async function connectMongo() {
  await client.connect();
  db = client.db('assignment');
  console.log('Connected to MongoDB');
}

connectMongo().catch(console.error);


app.use(cors());
app.use(express.json());

const REDIS_KEY = 'FULLSTACK_TASK_NANDKISHORE';
const MONGODB_COLLECTION = 'assignment_nandkishore';

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('add', async (note) => {
    if (typeof note !== 'string' || note.trim() === '') return;

    // Get current notes from Redis
    let notes = [];
    const redisData = await redis.get(REDIS_KEY);
    if (redisData) {
      notes = JSON.parse(redisData);
    }

    // Add new note
    notes.push(note.trim());
   console.log(notes,"notes added ")
    // Check if notes exceed 50
    if (notes.length > 50) {
      // Store in MongoDB
      await db.collection(MONGODB_COLLECTION).insertMany(
        notes.map(n => ({ note: n, createdAt: new Date() }))
      );
      // Flush Redis
      await redis.del(REDIS_KEY);
      notes = [];
    } else {
      // Update Redis
      await redis.set(REDIS_KEY, JSON.stringify(notes));
    }

    // Broadcast to all clients
    io.emit('noteAdded', note);
  });
});

app.get('/fetchAllTasks', async (req, res) => {
  try {
    // Fetch from Redis
    let notes = [];
    const redisData = await redis.get(REDIS_KEY);
    if (redisData) {
      notes = JSON.parse(redisData);
    }

    // Fetch from MongoDB
    const mongoNotes = await db.collection(MONGODB_COLLECTION)
      .find()
      .sort({ createdAt: 1 })
      .toArray();
    
    const allNotes = [
      ...mongoNotes.map((doc) => doc.note),
      ...notes
    ];

    res.json(allNotes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
