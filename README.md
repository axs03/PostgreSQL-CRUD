
## Building Docker Container
Everything is already written in the docker compose file. Make sure you are in the root directory of this repo. Then, run the following 
terminal command based on your machine:
### macOS
``` bash
docker compose up -d
```
### Windows:
``` bash
docker-compose up -d
```

Once completed, you can use
``` bash
docker ps
```
to see if the containers are running

## Accessing the Frontend
Once the container is up and running, go to: <br>
For the **Frontend table display**: [http://localhost](http://localhost:80) <br>
For the **SwaggerUI dashboard**: [http://localhost:8080](http://localhost:8080)


## Making Changes in the Frontend
We would make changes inside the HTML folder. 
``` text
html
├── css
│   ├── app.css
│   └── pure-min.css
├── index.html
└── js
    └── app.js
```
Mainly inside the <code>app,js</code> file. You guys know the rest :)