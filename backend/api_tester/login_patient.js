const axios = require(`axios`);

const payload = {
  email: `juan.c.vieri.22212@gmail.com`,
  password: `lol`,
};

async function run() {
  try {
    const res = await axios.post(
      `http://localhost:3000/patient/login`,
      payload
    );
    console.log(`Success!`);
    console.log(res.data);
  } catch (error) {
    console.error(`Error: ${error}`);
  }
}

run();
