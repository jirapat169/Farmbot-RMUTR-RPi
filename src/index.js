import firebase from "firebase-admin";
import serviceAccount from "./assets/farmbot-rmutr.json";
import Service from "./service";

(async () => {
  let network = await Service.checkNetwork(); // Status Network
  let portSelected = {
    port: null,
    isConnected: false,
    update_time: new Date().getTime(),
    baudRate: null,
    serialConnected: null,
  };

  firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: "https://farmbot-rmutr-default-rtdb.firebaseio.com",
  });

  const database = firebase.database(); // Initial Database

  // Table In Database
  const tblListSerialPort = database.ref("tblListSerialPort");
  const tblRPiOnline = database.ref("tblRPiOnline");
  const tblSerialPortSelected = database.ref("tblSerialPortSelected");
  const tblSerialPortStatus = database.ref("tblSerialPortStatus");
  const tblSerialWrite = database.ref("tblSerialWrite");
  const tblSerialRead = database.ref("tblSerialRead");

  if (network) {
    setInterval(() => {
      tblRPiOnline.update({ onlineTime: new Date().getTime() });
    }, 1000);
  }

  tblSerialWrite.remove();
  tblSerialRead.remove();
  tblSerialPortStatus.set({
    port: "",
    connectedTime: 0,
    status: false,
  });

  // tblSerialWrite.push({ msg: "hello", update_time: new Date().getTime() });

  Service.readSerialPort(async (port) => {
    if (port) {
      tblListSerialPort.set(port["list"]);
      if (portSelected.isConnected == false) {
        let filterPort = port["list"].filter(
          (el, i) => el["path"] == portSelected.port
        );

        if (filterPort.length > 0) {
          tblSerialPortSelected.set({
            port: portSelected.port,
            update_time: new Date().getTime(),
            baudRate: portSelected.baudRate,
          });

          await Service.delay(1000);
          console.log("Found Port");
        }
      }
    } else {
      tblListSerialPort.update(null);
    }
  });

  // Event onchange Serial Port
  tblSerialPortSelected.on("value", async (snapshot) => {
    tblSerialWrite.remove();
    tblSerialRead.remove();
    portSelected.port = `${snapshot.val()["port"]}`;
    portSelected.baudRate = parseInt(`${snapshot.val()["baudRate"]}`);
    portSelected.isConnected = true;
    console.log(portSelected.baudRate);
    tblSerialPortStatus.set({
      port: `${snapshot.val()["port"]}`,
      connectedTime: 0,
      status: false,
    });

    await Service.serialConnect(
      `${snapshot.val()["port"]}`,
      `${snapshot.val()["baudRate"]}`,
      (serial) => {
        portSelected.isConnected = serial.isOpen;
        portSelected.serialConnected = serial.isOpen ? serial.port : null;
        tblSerialPortStatus.set({
          port: `${snapshot.val()["port"]}`,
          connectedTime: serial.connectTime,
          status: serial.isOpen,
        });
      },
      (data) => {
        console.log("Serial Read -> ", data);
        tblSerialRead.push({
          msg: `${data}`,
          update_time: new Date().getTime(),
        });
      }
    );
  });

  tblSerialWrite.on("child_added", (snapshot) => {
    if (portSelected.serialConnected != null) {
      if (portSelected.isConnected) {
        console.log("Serial Write -> ", snapshot.val()["msg"]);
        portSelected.serialConnected.write(`${snapshot.val()["msg"]}\r`);
      }
    }
  });
})();
