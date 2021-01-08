const SerialPort = require("serialport");

class ServiceClass {
  constructor() {
    this.serial = {
      port: null,
      connectedTime: 0,
      interval: null,
    };
  }

  readSerialPort(callback) {
    setInterval(() => {
      SerialPort.list()
        .then((val) => {
          let port = [];
          let newObj = {};
          val.forEach((el, i) => {
            Object.keys(el).forEach((obj) => {
              newObj[`${obj}`] = el[obj] ? el[obj] : "";
            });
            port.push(newObj);
            newObj = {};
          });

          callback({ SerialPort: SerialPort, list: port });
        })
        .catch(() => {
          callback(null);
        });
    }, 1000);
  }

  async serialConnect(port, baudRate, serialCallback, serialData) {
    if (this.serial.port != null) {
      this.serial.port.close(async (ev) => {
        this.serial.connectedTime = 0;
        clearInterval(this.serial.interval);
        await this.delay(300);
      });
    }

    this.serial.port = new SerialPort(`${port}`, {
      baudRate: parseInt(`${baudRate}`),
      autoOpen: false,
    });

    await this.delay(300);

    this.serial.port.on("data", (ev) => {
      serialData(ev.toString());
    });

    this.serial.port.on("close", function (err) {
      console.log("Serial Error -> ", err);
    });

    this.serial.port.open((err) => {
      if (err) {
        serialCallback({
          port: this.serial.port,
          connectTime: 0,
          isOpen: false,
        });
      } else {
        this.serial.interval = setInterval(() => {
          if (this.serial.port.isOpen) {
            serialCallback({
              port: this.serial.port,
              connectTime: ++this.serial.connectedTime,
              isOpen: this.serial.port.isOpen,
            });
          } else {
            serialCallback({
              port: this.serial.port,
              connectTime: 0,
              isOpen: false,
            });
            clearInterval(this.serial.interval);
          }
        }, 1000);
      }
    });
  }

  checkNetwork() {
    return new Promise(async (res) => {
      let itv = setInterval(() => {
        console.log(".");
      }, 500);
      await this.delay(3000);
      clearInterval(itv);

      require("dns").resolve("www.google.com", function (err) {
        if (err) {
          process.kill(process.pid);
          res(false);
        } else {
          res(true);
        }
      });
    });
  }

  delay(time) {
    return new Promise((res) => {
      setTimeout(() => {
        res(true);
      }, time);
    });
  }
}

const Service = new ServiceClass();

export default Service;
