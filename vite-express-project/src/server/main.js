import "dotenv/config";
import express from "express";
import ViteExpress from "vite-express";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import session from "express-session";
import passport from "passport";
import passportGitHub from "passport-github2";
import path from "path";
import {fileURLToPath} from 'url';


const GitHubStrategy = passportGitHub.Strategy;
const app = express();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.static(path.join(__dirname,"../../public")));


app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: false,
        },
    }),
);

app.use(passport.initialize());
app.use(passport.session());
const uri = `mongodb+srv://${process.env.USERNAME}:${process.env.PASSWORD}@${process.env.HOST}`;
console.log(uri);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

let collection = null;
let users = null;

passport.serializeUser(function (user, done) {
    done(null, {
        _id: user._id.toString(),
        name: user.name,
    });
});

passport.deserializeUser(function (obj, done) {
    done(null, obj);
});

function calculatePriority(assignment) {
    const dueDate = new Date(assignment.deadline);
    const currentDate = new Date();
    const days = (dueDate - currentDate) / (1000 * 60 * 60 * 24);
    if (days <= 3 && (assignment.category === "Exam" || assignment.category === "Project")) {
        return "Urgent";
    }
    return "Not Urgent";
}

async function run() {
    await client.connect();
    const db = client.db("datatest");
    collection = db.collection("test");
    users = db.collection("users");

    await users.createIndex({ name: 1 }, { unique: true });

    await users.createIndex(
        { githubId: 1 },
        {
            unique: true,
            partialFilterExpression: {
                githubId: { $type: "string" },
            },
        },
    );

    await users.updateOne(
        { name: "admin" },
        {
            $set: { password: "admin" },
            $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true },
    );
}

function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({
            error: "Please log in first",
        });
    }
    next();
}

app.post("/login", async (req, res) => {
    const { username, password } = req.body ?? {};

    if (username !== "admin" || typeof password !== "string") {
        return res.status(401).json({
            error: "Invalid username or password.",
        });
    }

    try {
        const user = await users.findOne({ name: username });

        if (!user || password !== user.password) {
            return res.status(401).json({
                error: "Invalid username or password.",
            });
        }

        req.login(user, error => {
            if (error) {
                return res.status(500).json({
                    error: "Could not start session.",
                });
            }
            req.session.userId = user._id.toString();
            req.session.save(error => {
                if (error) {
                    return res.status(500).json({
                        error: "Could not save session.",
                    });
                }
                res.json({ message: "Logged in!" });
            });
        });
    } catch (error) {
        console.error("Login failed:", error.message);

        return res.status(500).json({
            error: "Could not log in.",
        });
    }
});

passport.use(
    new GitHubStrategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: process.env.GITHUB_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const githubId = String(profile.id);

                // Creates account on login
                await users.updateOne(
                    { githubId },
                    {
                        $set: {
                            githubUsername: profile.username,
                        },
                        $setOnInsert: {
                            name: `github:${githubId}`,
                            createdAt: new Date(),
                        },
                    },
                    { upsert: true },
                );

                const user = await users.findOne({ githubId });

                if (!user) {
                    return done(new Error("Could not find GitHub account."));
                }

                return done(null, user);
            } catch (error) {
                return done(error);
            }
        },
    ),
);

// Starts GitHub authentication.
app.get("/auth/github", passport.authenticate("github"));

// GitHub redirects here after authentication.
app.get(
    "/auth/github/callback",
    passport.authenticate("github", {
        failureRedirect: "/login.html?error=github",
    }),
    (req, res) => {
        req.session.userId = req.user._id.toString();

        req.session.save(error => {
            if (error) {
                return res.status(500).send("Could not save session.");
            }

            res.redirect("/");
        });
    },
);

app.post("/logout", (req, res) => {
    req.session.destroy(error => {
        if (error) {
            return res.status(500).json({
                error: "Could not log out.",
            });
        }

        res.clearCookie("connect.sid", { path: "/" });
        res.json({ message: "Logged out." });
    });
});

app.get("/docs", requireLogin, async (req, res) => {
    try {
        const docs = await collection
            .find({
                userId: req.session.userId,
            })
            .toArray();
        res.json(docs);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Could not Load assignments.",
        });
    }
});

app.post("/add", requireLogin, async (req, res) => {
    try {
        const assignment = {
            userId: req.session.userId,
            assignment: req.body.assignment,
            category: req.body.category,
            deadline: req.body.deadline,
        };
        assignment.priority = calculatePriority(assignment);
        await collection.insertOne(assignment);
        const results = await collection
            .find({
                userId: req.session.userId,
            })
            .toArray();
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "couldnt add assignment",
        });
    }
});

app.post("/remove", requireLogin, async (req, res) => {
    await collection.deleteOne({
        _id: new ObjectId(req.body._id),
        userId: req.session.userId,
    });

    const assignments = await collection
        .find({
            userId: req.session.userId,
        })
        .toArray();

    res.json(assignments);
});

app.post("/update", requireLogin, async (req, res) => {
    try {
        const updatedAssignment = {
            userId: req.session.userId,
            assignment: req.body.assignment,
            category: req.body.category,
            deadline: req.body.deadline,
        };
        updatedAssignment.priority = calculatePriority(updatedAssignment);
        await collection.updateOne(
            { _id: new ObjectId(req.body._id), userId: req.session.userId },

            { $set: updatedAssignment },
        );
        const results = await collection
            .find({
                userId: req.session.userId,
            })
            .toArray();
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Could not update assignment",
        });
    }
});

run()
    .then(() => {
         ViteExpress.listen(app, 3000, () => {
            console.log("Server listening on port 3000");
        });
    })
    .catch(error => {
        console.error("Database startup failed:", error.message);
        process.exitCode = 1;
    });
