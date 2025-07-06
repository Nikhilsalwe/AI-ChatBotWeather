import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import readlineSync from 'readline-sync'
import fetch from 'node-fetch';

dotenv.config();

async function fetchData(city) {
  const apiKey = process.env.WEATHER_API_KEY;
  const res = await fetch(`http://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${city}&aqi=no`);

  const data = await res.json();
  console.log("============== res ", data.current.temp_c)
  return `${data.current.temp_c}°C`;
}

// fetchData('PUNE')



const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const client = new OpenAI({
    apiKey: OPENAI_API_KEY
})

//tools 
async function getWeatherDetails (city = ''){
    const apiKey = process.env.WEATHER_API_KEY;
    const res = await fetch(`http://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${city}&aqi=no`);
  
    const data = await res.json();
    // console.log("============== res ", data.current.temp_c)
    return `${data.current.temp_c}°C`;
    // if(city.toLowerCase() === "akola") return '12°C';
    // if(city.toLowerCase() === "pune") return '14°C';
    // if(city.toLowerCase() === "mumbai") return '40°C';
    // if(city.toLowerCase() === "nagpur") return '30°C';
    // if(city.toLowerCase() === "yavatmal") return '45°C';
}
function getSunnyOrRainy (temp = ''){
    if(temp.toLowerCase() > '25°C') return 'Sunnay';
    if(temp.toLowerCase() < '20°C') return 'Rainy';
}


const tools = {
    "getWeatherDetails": getWeatherDetails,
    "getSunnyOrRainy": getSunnyOrRainy
}

const SYSTEM_PROMPT = `
    You are an AI assistant with START, PLAN, ACTION, OBSERVATION and OUTPUT STATE.
    wait for user prompt and wait for available tools.
    after planning take appropriate action using tools and wait for observation based on action.
    Once you get the observation, Reaturn AI response based on start propt and observations.
    Even if the user only says a city name (e.g., "pune"), assume they want to know the weather of that city.
    with city mentioned also mentioned if weather is sunny or rainy using below tools.
    Strictly follow JSON output format
    Available tools :- 
    - function getWeatherDetails (city)
    getWeatherDetails a function which accept city as string and return the weather details in string
    - function getSunnyOrRainy (temp)
    getSunnyOrRainy a function which accept temp as string and return the sunny or rainy.

    Example: 
    START
    {"type" : "user", "user": "what is the sum of weather of pune and mumbai city?"}
    {"type" : "plan", "plan": "I will call getWeatherDetails to get data for pune"}
    {"type" : "action", "function": "getWeatherDetails", "input": "pune"}
    {"type" : "observation", "observation": "14°C"}
    {"type" : "plan", "plan": "I will call getWeatherDetails to get data for mumbai"}
    {"type" : "action", "function": "getWeatherDetails", "input": "mumbai"}
    {"type" : "observation", "observation": "40°C"}
    {"type" : "output", "output": "the sum of weather of pune and mumbai is 54°C and it is sunny today"}
`

const messages = [
    {role: "system", content: SYSTEM_PROMPT}
]

while(true) {
    const query = readlineSync.question(">> ");
    const q = {
        role: "user",
        user: query
    }

    messages.push({role: 'user', content: JSON.stringify(q)})

    while(true) {
        const chat = await client.chat.completions.create({
            model: 'gpt-4.1',
            messages: messages,
            response_format: {type: 'json_object'}
        })

        const result = chat.choices[0].message.content
        messages.push({role: 'assistant', content: result})

        console.log("================= AI Start ===================\n\n")
        console.log(result)
        console.log("\n\n================= AI end ===================")

        const call = JSON.parse(result)

        if(call.type == "output") {
            console.log("output : ", call.output)
            break;
        } else if (call.type == "action") {
            const fn = tools[call.function]
            const observation = await fn(call.input)
            const obs = {type: "observation", "observation": observation}
            messages.push({role: "developer", content: JSON.stringify(obs)})
        }
    }
}

