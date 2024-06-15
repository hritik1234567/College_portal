const con=require("./connection.js");
const express=require("express");
const app=express();
const path=require("path");
const multer  = require('multer');
const session = require('express-session');
const fs = require("fs");
const pdf = require('pdf-parse');
const PDFDocument = require('pdfkit');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json(); 
const port=80;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.use(express.static(path.join(__dirname, 'static')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Serve static files from the 'images' directory
app.use(express.static(path.join(__dirname, 'images')));
app.use(session({
    secret: '   MyLeetcode@#12345', // Replace with a strong, randomly generated secret
    resave: false,
    saveUninitialized: false
}));



// Your other route handlers and configuration
app.post('/signup', (req, res) => {
    // Get form data from the request
    const {name, admissionNo, password, email, section, branch, phoneNumber } = req.body;
    console.log("Received form data:");
    console.log("Name:", name);
    console.log("Admission No:", admissionNo);
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("Section:", section);
    console.log("Branch:", branch);
    console.log("Phone Number:", phoneNumber);
    
    // Validate the data against the "user" table
    const sql = 'SELECT * FROM user WHERE email = ? AND admission_no = ? AND password = ?';
    con.query(sql, [email, admissionNo, password], (err, results) => {
      if (err) {
        console.error('Validation failed: ' + err);
        res.status(500).json({ error: 'Validation failed' });
        return;
      }
  
      // If validation succeeds and results are found, insert data into the "signup" table
      if (results.length > 0) {
        const insertSql = 'INSERT INTO signup ( name ,admission_number, email, password, section, branch, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?)';
        con.query(
          insertSql,
          [name,admissionNo, email, password, section, branch, phoneNumber],
          (err) => {
            if (err) {
              console.error('Insertion failed: ' + err);
              res.status(500).json({ error: 'Insertion failed' });
            } else {
            console.log('Insertion successful');
              res.redirect('/');
            }
          }
        );
      } else {
        res.status(400).json({ error: 'Validation failed' });
      }
    });
  });

 

  app.post('/student/login', (req, res) => {
    const { student_email, student_password } = req.body;
    console.log("Received form data:");
    console.log("Student Email:", student_email);
    console.log("Student password:", student_password);

    const loginsql = 'SELECT name, email, password, section FROM signup WHERE email=?';

    con.query(loginsql, [student_email], (err, results) => {
        if (err) {
            console.error('Validation query failed: ' + err);
            return res.status(500).json({ error: 'Validation query failed' });
        }

        if (results.length === 0) {
            // No user with the provided email exists
            return res.status(401).json({ error: 'User not found' });
        }

        const user = results[0];
        if (user.password === student_password) {
            req.session.student_email = student_email;
            req.session.name = user.name;
            req.session.section = user.section;
            console.log("Login Successful");
            console.log(req.session.name);
            console.log(req.session.section);
            res.cookie('student_name', req.session.name);
            res.cookie('section',req.session.section);
            res.redirect(`/studentdashboard.html`);
        } else {
            // Password does not match
            return res.status(401).json({ error: 'Invalid password' });
        }
    });
});


app.post('/teacher/login',(req,res)=>{
    const {teacher_email,teacher_password}=req.body;
    console.log("Received form data:");
    console.log("Teacher Email:",teacher_email);
    console.log("Teacher password:",teacher_password);
    const loginsql='Select name,email,password from teacherlogin where email=?';
    con.query(loginsql,[teacher_email],(err,results)=>{
        if (err) {
            console.error('Validation query failed: ' + err);
            return res.status(500).json({ error: 'Validation query failed' });
        }

        if (results.length === 0) {
            // No user with the provided email exists
            return res.status(401).json({ error: 'User not found' });
        }
        const user=results[0];
        if(user.password===teacher_password){
            req.session.teacher_email = teacher_email;
            req.session.name = user.name;
            res.cookie('teacher_name', req.session.name);
            console.log("Login Successful");
            res.redirect('/teacherdashboard.html');
        }
        else {
            // Password does not match
            return res.status(401).json({ error: 'Invalid password' });
        }
    })
})
app.post('/teacher/check', (req, res) => {
    const { sectioninput, subjectinput } = req.body;
    console.log("Received form data:");
    console.log("Section:", sectioninput);
    console.log("Subject:", subjectinput);

    const checksql = 'Select email_id from teacher where section=? AND subject=?';
    con.query(checksql, [sectioninput, subjectinput], (err, checkresults) => {
        if (err) {
            console.log('Validation query failed:' + err);
            return res.status(500).json({ error: 'Validation query failed' });
        }

        if (checkresults.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        const user = checkresults[0];
        if (user.email_id === req.session.teacher_email) {
            // Set the section and subject in the session for later use
            req.session.sectioninput = sectioninput;
            req.session.subjectinput = subjectinput;
            
            const sql = `SELECT name, mail_id,subject,marks FROM studentmarks WHERE section = ? AND subject=?`;
            con.query(sql, [sectioninput,subjectinput], (error, results) => {
                if (error) {
                    console.error('Query failed: ' + error);
                    
                    return res.status(500).json({ error: 'Query failed' });
                }
        
                if (results.length === 0) {
                    return res.status(404).json({ error: 'No data found' });
                }

                
                res.json(results);
            });
        } else {
            
            return res.status(401).json({ error: 'Invalid user' });
        }
    });
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads');
    },
    filename: function (req, file, cb) {
        
        // Use the correct fieldname for constructing the unique file name
        const uniqueFileName = `${Date.now()}-${file.fieldname.replace(/-/g, '')}${req.session.sectioninput || 'default'}`;


        cb(null, uniqueFileName);
    }
});
  
  const upload = multer({ storage: storage });

app.post("/upload", upload.single("assignment"), async (req, res) => {
    try {
        console.log(req.body);
        console.log(req.file);
        const { fieldname: pdfname, path: pdfpath } = req.file;
        const teacheremail = req.session.teacher_email;
        const subject = req.session.subjectinput || 'default';
        const uniquename = `${Date.now()}-${pdfname}${req.session.sectioninput || 'default'}`;
        const insertsql = 'Insert into pdfdata (pdfname,pdfpath,teacher_mail_id,subject,unique_name) Values (?,?,?,?,?)';
        con.query(insertsql, [pdfname, pdfpath, teacheremail, subject, uniquename], async (err) => {
            if (err) {
                console.error('Insertion failed: ' + err);
                return res.status(500).json({ error: 'Insertion failed' });
            } else {
                console.log("Insertion successful");

                // You can save the textContent and images paths to the database or use them as needed

                res.redirect("/teacherdashboard.html");
            }
        });
    } catch (error) {
        console.error('Error processing uploaded PDF:', error);
        return res.status(500).json({ error: 'Error processing uploaded PDF' });
    }
});

app.post('/update-marks', jsonParser, (req, res) => {
    const { mailId, newMarks } = req.body;
    const subject= req.session.subjectinput;
    const updatesql="Update studentmarks set marks=? where mail_id=? and subject=?";
    con.query(updatesql,[newMarks,mailId,subject],(err)=>{
        if(err){
            console.error("Update failed:"+err.message);
            return res.status(500).json({error: "Update failed"});
        }
        else{
            res.json({ success: true, message: 'Marks updated successfully' });}
    })
   
});


app.get('/assignments', async (req, res) => {
    try {
        const section = req.session.section || 'default';
        const selectSql = 'SELECT unique_name, pdfpath FROM pdfdata WHERE unique_name LIKE ?';

        con.query(selectSql, [`%${section}`], async (err, results) => {
            if (err) {
                console.error('Error fetching assignments:', err);
                return res.status(500).json({ error: 'Error fetching assignments' });
            }

            const assignments = [];
            for (const result of results) {
                const pdfName = result.unique_name;
                const pdfPath = `${result.pdfpath}`;

                // Construct the correct path to the PDF file
                const pdfFilePath = path.join(__dirname, pdfPath);

                try {
                    // Read the PDF file
                    const dataBuffer = fs.readFileSync(pdfFilePath);

                    // Parse the PDF
                    const data = await pdf(dataBuffer);

                    // Create a new PDF document
                    const doc = new PDFDocument();
                    const pdfOutputPath = path.join(__dirname, 'uploads', `${pdfName}.pdf`);

                    const pdfStream = fs.createWriteStream(pdfOutputPath);
                    
                    // Pipe the PDF document to a file
                    doc.pipe(pdfStream);

                    // Add text content to the new PDF
                    doc.fontSize(12).text(data.text);

                    // Embed images in the new PDF (assuming images are stored in the database as base64 strings)
                  /*  for (const imageBase64String of result.images) {
                        const imageBuffer = Buffer.from(imageBase64String, 'base64');
                        doc.image(imageBuffer, { width: 200 });
                    }*/

                    // Finalize the new PDF
                    doc.end();

                    // Push the generated PDF details to the assignments array
                    assignments.push({ pdfName, pdfPath: pdfPath });
                } catch (error) {
                    console.error(`Error reading or creating PDF ${pdfName}:`, error);
                    // Log the error and continue to the next file
                }
            }

            res.json(assignments);
        });
    } catch (error) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({ error: 'Error fetching assignments' });
    }
});

// ... (remaining code)
app.post('/studentresult', (req, res) => {
    console.log('Request to /studentresult received');
    const emailid = req.session.student_email;

    // Check if the user is authenticated
    if (!emailid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const sql = 'select subject, marks from studentmarks where mail_id=?';
    con.query(sql, [emailid], (error, results) => {
        if (error) {
            console.error("Some error occurred:", error);
            return res.status(500).json({ error: 'Extraction failed' });
        } else {
            console.log(results);
            res.json(results);
        }
    });
});



app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

