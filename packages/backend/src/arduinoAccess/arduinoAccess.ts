import { time } from "console";
import { states } from "../states";
import axios from "axios";
import { stat } from "fs";

const requestHost = "http://localhost:" + states.arduino.port;

export const connectTest = async () => {
  const requestUrl = `${requestHost}/test`;
  console.log(requestUrl);
  /*
  const response = await fetch(
    `http://${states.arduino.host}:${states.arduino.port}/test`
  );
  */
  try {
    const response = await fetch(requestUrl);
    console.log(response);
    const data = await response.json();
    if (data.success) {
      console.log("Arduino connected");
      return true;
    } else {
      console.log("Arduino not connected");
      return false;
    }
  } catch (e) {
    console.log("fetch error", e);
    return false;
  }
};

export const switchCtrl = async () => {
  console.log("switchCtrl");
  let relay: "on" | "off" = states.arduino.relay === "on" ? "off" : "on";
  const requestUrl = `${requestHost}/${relay}`;
  console.log(requestUrl);
  try {
    const response = await fetch(requestUrl);
    const data = await response.json();
    states.arduino.relay = data.success ? relay : states.arduino.relay;
    console.log(data.success);
    return data.success;
  } catch (e) {
    console.log("fetch error", e);
    return false;
  }
};

export const switchCramp = async (source) => {
  // const freq = 1000 / (20 * (states.stream.sampleRate[source] / 44100));
  const freq = states.stream.sampleRate[source] / 1000;
  const timeout =
    (1000 * states.stream.basisBufferSize) / states.stream.sampleRate[source];
  const params = { freq: freq, timeout: timeout };
  console.log("interval:", 1 / freq);
  console.log(params);
  // const body = JSON.stringify({ freq: freq, timeout: timeout });
  // console.log(body);
  // // const method = "POST";
  // // const headers = {
  // //   Accept: "application/json",
  // //   "Content-Type": "application/json",
  // // };
  // const options = {
  //   method: "POST",
  //   body: body,
  //   headers: {
  //     "Content-Type": "application/json",
  //   },
  // };
  const url = `${requestHost}/cramp`;
  // const response = await fetch(url, options);
  // return axios
  //   .post(url, { freq: freq, timeout: timeout })
  //   .then((response) => {
  //     console.log(response);
  //     return response.data.success;
  //   })
  //   .catch((error) => {
  //     console.log(error);
  //     return false;
  //   });

  try {
    const response = await axios.get(url, { params: params });
    console.log(response.data);
    return response.data.success;
  } catch (error) {
    console.error("error fetching data:", error);
    return false;
  }

  // const data = await response.json();
  // console.log(data);
  // return data.success;
};

export const switchOneshot = async (timeout) => {
  const url = `${requestHost}/oneshot`;
  const params = { timeout: timeout };
  try {
    const response = await axios.get(url, { params: params });
    console.log(response.data);
    return response.data.success;
  } catch (error) {
    console.error("error fetching data:", error);
    return false;
  }
};
