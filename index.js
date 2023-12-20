const express = require('express');
const { MongoClient, ObjectId } = require("mongodb");
const app = express()
const cors = require("cors");
const dotenv = require('dotenv').config();
const port = 3001;
const URL = process.env.DB;

app.use(express.json())
app.use(
  cors({
    origin: "*",
  })
);
app.get("/", function (req, res) {
  if (req.url === "/") {
    res.send(`
    <div style="display:flex; justify-content:center;padding:20px;"> 
      <a href="/get-mentors" style="text-decoration:none;color:black;">All Mentors list</a>
    <br>
    <a href="/get-students"  style="text-decoration:none;color:black;">All Students List</a>

    </div>
    
    `);
  } else {
    res.status(404).end(`
    <p>Error</p> 
    `);
  }
});

// API to Create Mentor
app.post('/mentors', async (req, res) => {
    try {
      const {mentorName,mentorMail} = req.body
      const connection = await MongoClient.connect(URL)
        const db = connection.db('Bootcamp');
        const result = await db.collection('mentors').insertOne({mentorName: mentorName,
          mentorMail: mentorMail,
          students: []});
        await connection.close()
        res.json({ message: 'Mentor created successfully', result: result});
      } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Something went wrong' });
    }
});


//get all mentors
app.get("/get-mentors", async (req, res) => {
  try {
    const connection = await MongoClient.connect(URL);
    const db = connection.db("Bootcamp");
    const mentorsData = await db.collection("mentors").find({}).toArray();
    connection.close();
    res.send(mentorsData);
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "Something went wrong" });
  }
});


// API to Create Student
app.post('/students', async (req, res) => {
  try {
    const {studentName,studentMail} = req.body;
    const newStudent = {
      studentName: studentName,
      studentMail: studentMail,
      oldMentor: null,
      currentMentor: null
    };
    const connection = await MongoClient.connect(URL)
      const db = connection.db('Bootcamp');
      const result = await db.collection('students').insertOne(newStudent);
      await connection.close()
      res.json({ message: 'student created successfully', result: result });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Something went wrong' });
  }
});

// get all students
app.get("/get-students", async (req, res) => {
  try {
    const connection = await MongoClient.connect(URL);
    const db = connection.db("Bootcamp");
    const studentsData = await db.collection("students").find({}).toArray();
    const students = studentsData.map((item) => ({
      studentId: item._id.toString(),
      studentName: item.studentName,
      studentMail: item.studentMail,
      oldMentor: item.oldMentor,
      currentMentor: item.currentMentor
    }));
    connection.close();
    res.send(students);
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "Something went Wrong" });
  }
});

// 3. Write API to Assign a student to Mentor
app.post("/studentToMentor", async (req, res) => {
  try {
    const {mentorId,studentId} = req.body;
    const mentorObjectId = new ObjectId(mentorId);
    const studentObjectId = new ObjectId(studentId);
    const connection = await MongoClient.connect(URL);
    const db = connection.db("Bootcamp");
    const mentorsCollection = db.collection("mentors");
    const studentsCollection = db.collection("students");
    const mentor = await mentorsCollection.findOne({ _id: mentorObjectId });
    const student = await studentsCollection.findOne({ _id: studentObjectId });
    if (!mentor || !student) {
      res.status(404).send({ error: "Mentor or student not found" });
      return;
    }
    await studentsCollection.updateOne(
      { _id: studentObjectId },
      { $set: { oldMentor: student.currentMentor, currentMentor: mentor.mentorName } }
    );
    await mentorsCollection.updateOne(
      { _id: mentorObjectId },
      { $push: { students: { studentName: student.studentName, studentMail: student.studentMail, studentId: studentObjectId } } }
    );
    connection.close();
    res.send({
      success: true,
      message: 'Mentor will be assigned',
      mentorName: mentor.mentorName
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "Something went wrong" });
  }
});


app.get("/students-without-mentors", async (req, res) => {
  try {
    const connection = await MongoClient.connect(URL);
    const db = connection.db("Bootcamp");
    const studentsData = await db.collection("students").find({
      oldMentor: { $eq: null },
      currentMentor: { $eq: null }
    }).toArray();
    const students = studentsData.map((item) => ({
      studentId: item._id.toString(),
      studentName: item.studentName,
      studentMail: item.studentMail,
      oldMentor: item.oldMentor,
      currentMentor: item.currentMentor
    }));
    connection.close();

    if (students.length > 0) {
      res.send(students);
    } else {
      res.send({ message: "No students with both oldMentor and currentMentor found" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

// 4. Write API to Assign or Change Mentor for particular Student

app.post("/change-mentor", async (req, res) => {
  try {
    const {mentorId,studentId,currentMentor:newcurrentMentor}=req.body
    const mentorObjectId = new ObjectId(mentorId);
    const studentObjectId = new ObjectId(studentId);
    const connection = await MongoClient.connect(URL);
    const db = connection.db("Bootcamp");
    const mentorsCollection = db.collection("mentors");
    const studentsCollection = db.collection("students");
    const mentor = await mentorsCollection.findOne({ _id: mentorObjectId });
    const student = await studentsCollection.findOne({ _id: studentObjectId });
    if (!mentor || !student) {
      res.status(404).send({ error: "Mentor or student not found" });
      return;
    }
    await studentsCollection.updateOne(
      { _id: studentObjectId },
      { $set: { oldMentor: student.currentMentor, currentMentor: newcurrentMentor } }
    );
    await mentorsCollection.updateOne(
      { _id: mentorObjectId },
      { $push: { students: { studentName: student.studentName, studentMail: student.studentMail, studentId: studentObjectId } } }
    );
    connection.close();
    res.send({ success: true, message : 'mentor will be changed for this student' });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "something went wrong" });
  }
});



// 5. Write API to show all students for a particular mentor
app.get("/:mentorName/students", async (req, res) => {

  try {
    const mentorName = req.params.mentorName;
    const connection = await MongoClient.connect(URL);
    const db = connection.db("Bootcamp");
    const mentorsCollection = db.collection("mentors");
    const mentor = await mentorsCollection.findOne({mentorName:mentorName});

    res.send(mentor.students)
  } catch (error) {
    console.log(error)
  }
})


// 6. Write API to show the previously assigned mentor for a particular student
app.get("/oldmentor-by-student/:studentName", async (req, res) => {
  try {
    const {studentName} = req.params;
    const connection = await MongoClient.connect(URL);
    const db = connection.db("Bootcamp");
    const studentsCollection = db.collection("students");
    const student = await studentsCollection.findOne({ studentName: studentName });
    if(student.oldMentor === null) {
      res.send({
        message : 'No older mentor for this student'
      })
    }else{
      res.send({ oldMentor: student.oldMentor })
    }
  } catch (error) {
    console.log(error)
  }
})



app.listen(port, () => {
  console.log("server started at " + port);
});