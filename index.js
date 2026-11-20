import express from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";

const app = express();
const PORT = 8000;

const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("Mongodb connet");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

app.use(cors());
app.use(express.json());

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("rangpur-event");
const event = db.collection("events");

app.post("/create-event", async (req, res) => {
  const data = req.body;
  const result = await event.insertOne(data);
  res.send(result);
});

app.get("/upcoming-events", async (req, res) => {
  const result = await event.find().toArray();
  res.send(result);
});

app.get("/recent-event", async (req, res) => {
  const result = await event.find().limit(6).toArray();
  res.send(result);
});
app.get("/event/:id", async (req, res) => {
  const { id } = req.params;
  const result = await event.findOne({ _id: new ObjectId(id) });
  res.send(result);
});

app.get("/", (req, res) => {
  res.send({ message: "Server run" });
});

app.listen(PORT, () => {
  console.log(`Server port ${PORT}`);
});