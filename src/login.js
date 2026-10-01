import "dotenv/config";
import {ctx,save} from "./browser.js";
import {createInterface} from "node:readline/promises";
const {browser,context}=await ctx(false);
try{const page=await context.newPage();await page.goto("https://www.instagram.com/accounts/login/",{waitUntil:"domcontentloaded",timeout:60000});const rl=createInterface({input:process.stdin,output:process.stdout});await rl.question("Log in manually using the private desktop on port 6080. After your feed appears press ENTER here: ");rl.close();const cookies=await context.cookies("https://www.instagram.com");if(!cookies.some(c=>c.name==="sessionid"&&c.value))throw Error("LOGIN_NOT_COMPLETED");await save(context);console.log("Session saved locally; excluded from Git.")}finally{await browser.close()}
