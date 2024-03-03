import express from "express";
import bodyParser from "body-parser";
import apiRoutes from "./api/api.js";
const app = express();

app.use(express.urlencoded({ extended: true} ))
app.use(express.json())
app.use(bodyParser.urlencoded({extended:true}))

app.use("/api", apiRoutes)


app.listen(8080, () => {
  console.log("Running")
})
