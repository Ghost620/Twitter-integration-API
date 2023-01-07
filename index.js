import { TwitterApi } from 'twitter-api-v2';
import express from 'express';
import cors from 'cors';
import bodyParser from "body-parser";
import fs from "fs"
import { stringify } from 'csv-stringify'
import axios from 'axios';
//import { v4 as uuidv4 } from 'uuid';

const app = express()
const port = process.env.PORT || 3000
app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.json())

const twitterClient = new TwitterApi('AAAAAAAAAAAAAAAAAAAAAGo2lAEAAAAA9Jp%2FHIWaq%2FhNTaQqwI9L9%2FKGwZU%3DLScKzuLTNnHXXCQwS3VzGvaDlzKFFLPhDtD7sonHd0wUyVFvRJ');
const readOnlyClient = twitterClient.readOnly;

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

        var cond = false
        cond = (dataKeys.includes("user_id") && data['user_id'] != '') ? (dataKeys.includes("username") && data['username'] != '') ? (dataKeys.includes("twitter_id") && data['twitter_id'] != '') ? (dataKeys.includes("env") && data['env'] != '') ? (data['env'] == 'dev' || data['env'] == 'prd') ? true : response.status(500).send({'error': "env should be either dev or prd"}) : response.status(500).send({'error': "env not provided"}) : response.status(500).send({'error': "Twitter ID not provided"}) : response.status(500).send({ 'error': "Username not provided" }) : response.status(500).send({ 'error': "User ID not provided" })

        if (cond === true) {

            await readOnlyClient.v2.userTimeline(
                data["twitter_id"] , { 
                  exclude: ["replies", "retweets"],
                  max_results: data["max_results"] ? data["max_results"] : 10,
                }
            ).then(async (res) => {
    
                const dataCsv = res._realData.data.map((tweet) => (
                    { Prompt: `Write an engaging tweet by Twitter user @${data["username"]}` , Completion: tweet.text }
                ))
    
                stringify(dataCsv, {
                    header : true,
                    columns : { Prompt : "Prompt", Completion: "Completion" }
                  }, async (err, output) => {
                    const filename = `tweets-${data['username']}.csv`
                    fs.writeFileSync(filename, output);
                    var filedata = fs.readFileSync(filename);
    
                    var dataDb = JSON.stringify({
                        "upload": {
                            "filename": filename,
                            "contents": filedata.toString('base64'),
                            "private": false
                        }
                    });
    
                    const URL = (data['env'] == "dev") ? `https://no-code-ai-model-builder.com/version-test/api/1.1/obj/user/${data['user_id']}`
                     : ( (data['env'] == "prd") ? `https://no-code-ai-model-builder.com/api/1.1/obj/user/${data['user_id']}` : '' )
    
                    var config = {
                        method: 'patch',
                        url: URL,
                        headers: { 
                            'Authorization': 'Bearer a93b979a285cc2cc945e767a8d078dad', 
                            'Content-Type': 'application/json'
                        },
                        data : dataDb
                    };
        
                    await axios(config)
                    .then( () => {
                        response.status(200).send(res)
                    })
                    .catch(function (error) {
                        response.status(406).send({error: error.cause, message: "Failed to create/upload Tweets file "})
                    });
                    
                });
    
            }).catch((err) => {
                response.status(err.code).send(err.data)
            })

        }

    }

})

app.listen(port, () => {
    console.log(`listening on PORT: ${port}`)
  })