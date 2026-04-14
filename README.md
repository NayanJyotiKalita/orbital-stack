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

So I decided to change the hostport (why to disturb an already running process, it might cause other problems with the already running process)

```shell
# Running the container at host port 8081
docker run -d -p 8081:8080 --name telemetry-cont telemetry-ingestor
```










