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

So we have tested running all the containers locally to check if everything run properly and glad that we did as we debugged a lot which we can now apply at a proper production level. 

So now we use docker compose to simulate a mini production system locally.

We have configured all the four services in [docker-compose.yaml](docker-compose.yaml) file and run it:

```
cd orbital-stack

docker compose up --build
```

And voila, we have all the four images and the four respective containers running on it:

<img width="1478" height="927" alt="Screenshot 2026-04-14 162316" src="https://github.com/user-attachments/assets/a11fb257-c114-4a25-9ecf-990a32c7d2fd" />

<img width="1919" height="352" alt="Screenshot 2026-04-14 162256" src="https://github.com/user-attachments/assets/7a5bae2f-872e-44b2-992a-7b9512c94c14" />

---

# KIND Cluster Creation

We created the cluster config here [cluster.yaml](kind/cluster.yaml) with one control-plane and three worker nodes

```
kind create cluster --config cluster.yaml
```

<img width="1107" height="501" alt="Screenshot 2026-04-15 182009" src="https://github.com/user-attachments/assets/52400ea2-77b9-4fd3-9069-ecf2d5bf93cf" />

We can see the nodes using docker ps:

<img width="1617" height="158" alt="Screenshot 2026-04-15 182151" src="https://github.com/user-attachments/assets/aafc0006-ffb1-43ce-b2d3-62ffb9123ca8" />

But we need to use the kubernetes command line tool which is kubectl so we installed kubectl

<img width="1590" height="871" alt="Screenshot 2026-04-15 182400" src="https://github.com/user-attachments/assets/e115f592-1d0f-4a59-90c1-9a1602b71eab" />

---
---
---

# Bootstrapping the Cluster

Installing 

  - Ingress-nginx  --> to handle external traffic
  - ArgoCD         --> GitOps Deployment
  - Cert-Manger    --> TLS certificates

Wrote the [bootstrap script](scripts/bootstrap.sh) for installing the above components.

All the components are installed successfully
***Bonus***: Configured my `bashrc` file for some efficiency:

<img width="413" height="123" alt="Screenshot 2026-04-15 225817" src="https://github.com/user-attachments/assets/321afa1f-fe66-435d-9a7b-4399d623dd4e" />

<img width="779" height="586" alt="Screenshot 2026-04-15 231006" src="https://github.com/user-attachments/assets/3c1e7792-b873-412f-8a8a-f860c1ab6df1" />

---

---

---

# Creation of Helm Charts

Our objective here is to deploy the device-api service to a local K8s cluster using helm, ensuring:
  - Proper container image usage
  - K8s compatibility
  - Readiness & liveness validation

In our helm charts e.g. in the [device-api](helm/charts/device-api/values.yaml), we first mentioned the image to be device-api and tag as v1. But when it tried to pull the image through the [deployment](helm/charts/device-api/templates/deployment.yaml), it tries to pull it from Docker Hub - not from our local images. So it fails to pull the images and the Status of pods is ImagePullBackOff

<img width="722" height="81" alt="Screenshot 2026-04-16 233832" src="https://github.com/user-attachments/assets/e337b25b-0841-4da9-baad-303256a064ee" />

We decided to load our docker image into kind:

```
# Build the image
docker build -t orbital-stack-device-api:v1 services/device-api

#Copying the image into kind-control plane and worker nodes
kind load docker-image orbital-stack-device-api:v1
```

Fix the values.yaml file:

```
image:
    repository: orbital-stack-device-api
    tag: v1
    pullPolicy: IfNotPresent   # don’t try pulling from internet
```

And add this into templates/deployment.yaml:

```
imagePullPolicy: {{ .Values.image.pullPolicy }}
```

Now we run our `helm upgrade command`:
```
helm upgrade --install device-api helm/charts/device-api
```

Finally I can see our pods running:

<img width="613" height="81" alt="Screenshot 2026-04-16 224727" src="https://github.com/user-attachments/assets/22ecf8bf-deed-4a26-a160-9050f79df6f9" />

And tested the service:

```
kubectl port-forward svc/device-api 9000:9000

curl http://localhost:9000/api/v1/test
```

<img width="743" height="121" alt="Screenshot 2026-04-16 175230" src="https://github.com/user-attachments/assets/6f8a9feb-e294-431b-8661-04037c586b83" />

<img width="730" height="102" alt="Screenshot 2026-04-16 175244" src="https://github.com/user-attachments/assets/516b8dd2-7404-42b9-b146-3d712eff1b3d" />

---

## Ingress for External User Access

We have our ingress controller running:

<img width="894" height="74" alt="Screenshot 2026-04-17 152931" src="https://github.com/user-attachments/assets/72c049f3-85ba-440a-b895-bd31f1511f98" />

Wrote the [ingress.yaml](helm/charts/device-api/templates/ingress.yaml) file 



























