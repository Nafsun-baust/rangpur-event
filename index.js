import express from "express";
import cors from "cors";
import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";
import { createRemoteJWKSet, jwtVerify } from "jose";

const app = express();
const PORT = process.env.PORT || 8000;

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
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).send({ msg: "Unauthorized!" });
  }
};

app.post("/create-event", verifyToken, async (req, res) => {
  const data = req.body;
  const result = await event.insertOne(data);
  res.send(result);
});

app.get("/upcoming-events", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const result = await event
    .find({ eventDate: { $gte: today } })
    .sort({ eventDate: 1 })
    .toArray();
  res.send(result);
});

app.get("/recent-event", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const result = await event
    .find({ eventDate: { $gte: today } })
    .sort({ eventDate: 1 })
    .limit(6)
    .toArray();
  res.send(result);
});

app.get("/event/:id", async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(404).send({ msg: "Event not found" });
  }
  const result = await event.findOne({ _id: new ObjectId(id) });
  if (!result) {
    return res.status(404).send({ msg: "Event not found" });
  }
  res.send(result);
});

app.patch("/event/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(404).send({ msg: "Event not found" });
  }
  const existing = await event.findOne({ _id: new ObjectId(id) });
  if (!existing) {
    return res.status(404).send({ msg: "Event not found" });
  }
  if (req.user?.email && existing.creatorEmail !== req.user.email) {
    return res.status(403).send({ msg: "Forbidden!" });
  }
  const { creatorEmail, ...data } = req.body;
  const result = await event.updateOne(
    { _id: new ObjectId(id) },
    { $set: data }
  );
  res.json(result);
});

app.delete("/event/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(404).send({ msg: "Event not found" });
  }
  const existing = await event.findOne({ _id: new ObjectId(id) });
  if (!existing) {
    return res.status(404).send({ msg: "Event not found" });
  }
  if (req.user?.email && existing.creatorEmail !== req.user.email) {
    return res.status(403).send({ msg: "Forbidden!" });
  }
  const result = await event.deleteOne({ _id: new ObjectId(id) });
  res.json(result);
});

app.get("/manage-events/:email", verifyToken, async (req, res) => {
  const { email } = req.params;
  if (req.user?.email && req.user.email !== email) {
    return res.status(403).send({ msg: "Forbidden!" });
  }
  const result = await event.find({ creatorEmail: email }).toArray();
  res.send(result);
});

app.post("/join-event", verifyToken, async (req, res) => {
  const data = req.body;
  const isJoined = await joinedEvent.findOne({
    eventId: data.eventId,
    email: data.email,
  });
  if (isJoined) {
    return res.send({ alreadyJoined: true });
  }
  const result = await joinedEvent.insertOne(data);
  res.send(result);
});

app.get("/joined-events/:email", verifyToken, async (req, res) => {
  const { email } = req.params;
  if (req.user?.email && req.user.email !== email) {
    return res.status(403).send({ msg: "Forbidden!" });
  }
  const result = await joinedEvent
    .find({ email: email })
    .sort({ eventDate: 1 })
    .toArray();
  res.send(result);
});

app.delete("/joined-events/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(404).send({ msg: "Joined event not found" });
  }
  const existing = await joinedEvent.findOne({ _id: new ObjectId(id) });
  if (!existing) {
    return res.status(404).send({ msg: "Joined event not found" });
  }
  if (req.user?.email && existing.email !== req.user.email) {
    return res.status(403).send({ msg: "Forbidden!" });
  }
  const result = await joinedEvent.deleteOne({ _id: new ObjectId(id) });
  res.json(result);
});

app.get("/", (req, res) => {
  res.send({ message: "Server run" });
});

app.listen(PORT, () => {
  console.log(`Server port ${PORT}`);
});

export default app;