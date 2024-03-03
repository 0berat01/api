import express from "express";
import slugify from "slugify";
import multer from "multer";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  setDoc,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore/lite";
import { getApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getBytes } from "firebase/storage";
import crypto from "node:crypto";
const firebaseConfig = {
  apiKey: process.env.apiKey,
  authDomain: process.env.authDomain,
  projectId: process.env.projectId,
  storageBucket: process.env.storageBucket,
  messagingSenderId: process.env.messagingSenderId,
  appId: process.env.appId,
  measurementId: process.env.measurementId,
};

const upload = multer();

const app = initializeApp(firebaseConfig);
const db = getFirestore();
const router = new express.Router();

const storage = getStorage(app);

/*GET blog/article/article-slug

{
Content info : [
Title
Description
Thumbnail
Keywords
Slug
UUID
Date Added
Author
],
Body : [
Article Content (markdown)
]
}*/

router.get("/blog/articles", (req, res) => {
  getDocs(collection(db, "blogs"))
    .then((snapshot) => {
      const response = [];
      snapshot.docs.forEach((document) => {
        response.push(document.data()["content-info"]);
      });
      res.status(200).json({
        status: 200,
        data: response,
      });
    })
    .catch(() => {
      res.status(400).json({
        status: 400,
        message: "An error occured.",
      });
    });
});

router.get("/blog/articles/:id", async (req, res) => {
  let document = await getDoc(doc(db, "blogs", req.params.id));
  if (!document.exists()) {
    res.status(404).json({
      status: 404,
      message: "Couldn't found any blog article with provided id.",
    });
  }
  document = document.data();
  res.status(200).json({
    status: 200,
    data: document,
  });
});

router.post("/blog/articles", upload.single("thumbnail"), async (req, res) => {
  if (req.file) {
    const storageRef = ref(storage, req.body.id);
    await uploadBytes(storageRef, req.file.buffer)
    res.end();
    return;
  }

  const uuid = crypto.randomUUID();
  const contentInfo = req.body["content-info"];
  const body = req.body.body;
  const slug = slugify(contentInfo.title);
  const data = {
    "content-info": {
      title: contentInfo.title,
      description: contentInfo.description,
      keywords: contentInfo.keywords,
      slug: slug,
      uuid: uuid,
      createdAt: new Date(),
      author: contentInfo.author,
    },
    body: {
      "article-content": body["article-content"],
    },
  };
  setDoc(doc(db, "blogs", uuid), data)
    .then(() => {
      res.status(200).json(data);
    })
    .catch((err) => {
      console.log(err)
      res.status(400).json({
        status: 200,
        message: "An error occured.",
      });
    });
});

router.delete("/blog/articles/:id", async (req, res) => {
  const docRef = doc(db, "blogs", req.params.id);
  const document = await getDoc(docRef);
  if (!document.exists()) {
    res.status(404).json({
      status: 404,
      message: "Couldn't found any blog article with provided id.",
    });
    return;
  }

  deleteDoc(docRef)
    .then(() => {
      res.status(200).json({ status: 200 });
    })
    .catch(() => {
      res.status(400).json({ status: 400, message: "An error occured." });
    });
});

router.patch("/blog/articles/:id", async (req, res) => {
  const docRef = doc(db, "blogs", req.params.id);
  let document = await getDoc(docRef);
  if (!document.exists()) {
    res.status(404).json({
      status: 404,
      message: "Couldn't found any blog article with provided id.",
    });
    return;
  }
  document = document.data()
  const docContent = document["content-info"];
  const docBody = document["body"]
  const { title, description, author, keywords } = req.body["content-info"];
  const articleContent = req.body.body?.["article-content"]
  const contentInfo = {
    title: title ?? docContent.title,
    description: description ?? docContent.description,
    keywords: keywords ?? docContent.keywords,
    author: author ?? docContent.author,
    slug: title ? slugify(title) : docContent.slug,
    createdAt: docContent.createdAt,
    uuid: docContent.uuid
  }

  const body = {
    "article-content": articleContent ?? docBody["article-content"]
  }
  const data = {
    "content-info": contentInfo,
    "body": body
  }

  updateDoc(docRef, data)
    .then(() => {
      res.status(200).json({ status: 200, data: data });
    })
    .catch(() => {
      res.status(400).json({ status: 400, message: "An error occured." });
    });
});

router.post("/mail/post", (req, res) => {});

router.get("/thumbnails/:id", async (req, res) => {
  const storageRef = ref(getStorage(app), req.params.id);
  getBytes(storageRef)
    .then((arrayBuffer) => res.end(Buffer.from(arrayBuffer)))
    .catch((err) => {
      if (err.code == "storage/object-not-found") {
        return res.status(404).end();
      }
      res.status(400).end();
    });
});
export default router;
