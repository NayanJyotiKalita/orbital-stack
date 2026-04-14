## Made the Entire Directory Structure

<img width="318" height="800" alt="Screenshot 2026-04-14 120117" src="https://github.com/user-attachments/assets/bcce8106-dab2-4c83-a99c-8041a42cfa17" />

---

## Created the first image of the [device-api service](services/device-api) (local testing so that it doesn't affect the CI/CD)

<img width="859" height="230" alt="Screenshot 2026-04-14 121104" src="https://github.com/user-attachments/assets/592d600d-1e7f-4e05-b0d0-5a876d9c6383" />

</br>

</br>

It's a good thing that we did the local testing as there was an issue with copying the files. 

<img width="1112" height="485" alt="Screenshot 2026-04-14 123113" src="https://github.com/user-attachments/assets/def1347d-b25a-463d-93da-17691ec74fb1" />

</br>

Here's the beauty of docker image building showed up - it completed building the 3rd layer and after resolving the issue when we tried to build the image again, it did not start from scratch - it resumed from where it left.

</br>

<img width="1084" height="291" alt="Screenshot 2026-04-14 123233" src="https://github.com/user-attachments/assets/e3211742-bbae-42a8-b39d-9e6f8af17f2a" />


Finally, done with the local image pulling and build test:

<img width="828" height="303" alt="Screenshot 2026-04-14 125613" src="https://github.com/user-attachments/assets/af9b75f0-1f04-4aa9-afea-1f36dafa0059" />

We pulled the version 2 of eclipse-mosquitto image as the previous versions are much more stable than the latest ones.

---

## Running our containers locally

### Container - `device-api-cont` 

```shell
docker run -d -p 9000:9000 --name device-api-cont device-api

curl http://localhost:9000/health/ready
# ==> READY

curl http://localhost:9000/health/live
# ==> ALIVE
```

<img width="1288" height="44" alt="Screenshot 2026-04-14 131913" src="https://github.com/user-attachments/assets/8cabac2f-1357-4a70-801b-e9d563404ca1" />
<img width="1542" height="176" alt="Screenshot 2026-04-14 132059" src="https://github.com/user-attachments/assets/746c7bf9-144d-4dee-b904-a86b1ce8ac93" />

---

### Container - `telemetry-cont` 

AS I have exposed my container internally at port no 8080, I also mapped it to port 8080 of the host but as there was another process already using this port

```shell
# Running the container on host port 8080
docker run -d -p 8080:8080 --name telemetry-cont telemetry-ingestor

# Checking which ports were accessed by which process
netstat -nplt
```

<img width="1159" height="445" alt="Screenshot 2026-04-14 133150" src="https://github.com/user-attachments/assets/55b5df4b-1788-454e-824c-4d65d6a3d8b7" />

</br>

</br>

So I decided to change the host port (why to disturb an already running process, it might cause other problems with the already running process)

```shell
# Running the container at host port 8081
docker run -d -p 8081:8080 --name telemetry-cont telemetry-ingestor
```

But it was still exiting. 

And when checked the logs, I found this:

```
root@njk:/mnt/d/orbital-stack/services/telemetry-ingestor# docker logs 19
Traceback (most recent call last):
  File "/app/app.py", line 1, in <module>
    from flask import Flask
ModuleNotFoundError: No module named 'flask'
```

This happened due to using distroless images in the multi-stage docker build Dockerfile: 
```
# Build Stage
FROM python:3.11-alpine AS builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Runtime Stage
FROM gcr.io/distroless/python3-debian11

WORKDIR /app
COPY --from=builder /app .

EXPOSE 8080

CMD ["app.py"]
```

So we change it to a single stage using light python-alpine image:
```
FROM python:3.11-alpine

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

CMD ["python", "app.py" ]
```

After building the image with the new Dockerfile, finally the container was running and was in a healthy and alive state:

```
# Rebuilding the image with the new Dockerfile
docker build -t telemetry-ingestor .

# Running the container on the host post 8081
docker run -d -p 8081:8080 --name telemetry-cont telemetry-ingestor

# Fetching the status
curl http://localhost:8081/ready
# ==> READY

curl http://localhost:8081/health
# ==> ALIVE
```

<img width="1919" height="836" alt="Screenshot 2026-04-14 151612" src="https://github.com/user-attachments/assets/d11ab11b-54c0-41da-b26c-cf676a58fc46" />

---

### Container - `ota-controller-cont` 

While trying to run the ota-controller-cont using ota-controller image, I still faced the issue of container exiting immediately and when I checked the logs I found out:

```
root@njk:/mnt/d/orbital-stack/services/ota-controller# docker logs 11
node:internal/modules/cjs/loader:1228
  throw err;
  ^

Error: Cannot find module '/app/node'
    at Module._resolveFilename (node:internal/modules/cjs/loader:1225:15)
    at Module._load (node:internal/modules/cjs/loader:1051:27)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:174:12)
    at node:internal/main/run_main_module:28:49 {
  code: 'MODULE_NOT_FOUND',
  requireStack: []
}

Node.js v20.17.0
```

This meant that I was again using the command ‘node’ along with ‘server.js’ in the Dockerfile (CMD [“node”, “server.js”]) which is not allowed in a distroless setup. But when I checked my Dockerfile, everything was ok, i was using the single command - CMD [“server.js”].

But the error was pointing to a different way. So what happens in docker is that it caches layers aggressively so it was maybe using the old CMD which had the “node” command in it. So we force clean rebuild

```
docker build --no-cache -t ota-controller .
```

And yes, when I run the container using this image, it runs successfully:

<img width="1774" height="845" alt="Screenshot 2026-04-14 153220" src="https://github.com/user-attachments/assets/678741c2-04ff-4203-ba1a-b81010b36741" />

<img width="1033" height="117" alt="Screenshot 2026-04-14 154916" src="https://github.com/user-attachments/assets/ab38fb6c-f8aa-4ed6-bb14-f85f68665de7" />

---

### Container - `mqqt-cont` 

We run the mqqt-cont container using the eclipse-mosquitto:2 image and it ran successfully and we have all the 4 containers running in our local set up:

```
docker run -d -p 1883:1883 --name mqqt-cont eclipse-mosquitto:2
```

<img width="1902" height="227" alt="Screenshot 2026-04-14 155328" src="https://github.com/user-attachments/assets/719c519b-e13b-495f-b847-528c1559e17b" />

---

# Running Docker Compose 




























