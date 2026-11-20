import express from "express";
import cors from "cors";
import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";
import { createRemoteJWKSet, jwtVerify } from "jose";

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
const joinedEvent = db.collection("joinedEvents");

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ msg: "Unauthorized!" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).send({ msg: "Unauthorized!" });
  }

  const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
  );

  try {
    const { payload } = await jwtVerify(token, JWKS);
    next();
  } catch (error) {
    return res.status(500).send({ msg: "Server Error!" });
  }
};

app.post("/create-event", verifyToken, async (req, res) => {
  const data = req.body;
  const result = await event.insertOne(data);
  res.send(result);
});

app.get("/upcoming-events", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const result = await event.find({ eventDate: { $gte: today } }).toArray();
  res.send(result);
});

app.get("/recent-event", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const result = await event
    .find({ eventDate: { $gte: today } })
    .limit(6)
    .toArray();
  res.send(result);
});

app.get("/event/:id", async (req, res) => {
  const { id } = req.params;
  const result = await event.findOne({ _id: new ObjectId(id) });
  res.send(result);
});

app.patch("/event/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const result = await event.updateOne(
    { _id: new ObjectId(id) },
    { $set: data }
  );
  res.json(result);
});

app.delete("/event/:id", async (req, res) => {
  const { id } = req.params;
  const result = await event.deleteOne({ _id: new ObjectId(id) });
  res.json(result);
});

app.get("/manage-events/:email", async (req, res) => {
  const { email } = req.params;
  const result = await event.find({ creatorEmail: email }).toArray();
  res.send(result);
});

app.post("/join-event", async (req, res) => {
  const data = req.body;
  const result = await joinedEvent.insertOne(data);
  res.send(result);
});

app.get("/joined-events/:email", async (req, res) => {
  const { email } = req.params;
  const result = await joinedEvent
    .find({ email: email })
    .sort({ eventDate: 1 })
    .toArray();
  res.send(result);
});

app.get("/", (req, res) => {
  res.send({ message: "Server run" });
});

app.listen(PORT, () => {
  console.log(`Server port ${PORT}`);
});

export default app;