import { TwitterApi } from 'twitter-api-v2';

const twitterClient = new TwitterApi('AAAAAAAAAAAAAAAAAAAAAGo2lAEAAAAA9Jp%2FHIWaq%2FhNTaQqwI9L9%2FKGwZU%3DLScKzuLTNnHXXCQwS3VzGvaDlzKFFLPhDtD7sonHd0wUyVFvRJ');

const readOnlyClient = twitterClient.readOnly;

import express from 'express';
import cors from 'cors';
import bodyParser from "body-parser";
import fs from "fs"
import {stringify} from 'csv-stringify'

const app = express()
const port = process.env.PORT || 3000
app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.json())

app.get('/', (req, res) => {
    res.status(404).send("WELCOME")
})

app.post('/twitter-data', async (req, response) => {

    const data = req.body
    const dataKeys = Array.from(Object.keys(data))

    if (dataKeys.length === 1 && dataKeys[0] === 'username') {

        await readOnlyClient.v2.userByUsername(
            data['username'],
            { "user.fields": ["description", "profile_image_url"] }
        )
        .then((res) => {
            response.status(200).send(res)
        }).catch((err) => {
            response.status(err.code).send(err.data)
        })

    } else {

        await readOnlyClient.v2.userTimeline(
            data["twitter_id"] , { 
              exclude: ['replies', 'retweets'],
              max_results: data["max_results"] ? data["max_results"] : 10,
            }
        ).then(async (res) => {

            const dataCsv = res._realData.data.map((tweet) => (
                { Prompt: `Write an engaging tweet by Twitter user @${data['username']}` , Completion: tweet.text }
            ))

            stringify(dataCsv, {
                header : true,
                columns : { Prompt : "Prompt", Completion: "Completion" }
              }, (err, output) => {
                fs.writeFileSync("demoB.csv", output);
                console.log("OK");
            });

            response.status(200).send(res)
        }).catch((err) => {
            response.status(err.code).send(err.data)
        })

    }

})



app.listen(port, () => {
    console.log(`listening on PORT: ${port}`)
  })