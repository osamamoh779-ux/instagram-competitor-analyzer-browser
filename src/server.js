import "dotenv/config";import express from "express";import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";import {StreamableHTTPServerTransport} from "@modelcontextprotocol/sdk/server/streamableHttp.js";import {z} from "zod";import {loginStatus,profileSnapshot,inspectContent} from "./instagram.js";
const app=express();app.use(express.json({limit:"1mb"}));
function make(){const s=new McpServer({name:"instagram-competitor-analyzer-browser",version:"0.2.0"});
s.tool("instagram_login_status","Check reusable Instagram session.",{},async()=>({content:[{type:"text",text:JSON.stringify(await loginStatus())}]}));
s.tool("get_competitor_profile","Read visible public competitor profile data and recent content URLs.",{username:z.string(),limit:z.number().int().min(1).max(50).optional()},async({username,limit})=>({content:[{type:"text",text:JSON.stringify(await profileSnapshot(username,limit||30))}]}));
s.tool("inspect_instagram_content","Inspect a public Instagram Reel/post.",{url:z.string().url()},async({url})=>({content:[{type:"text",text:JSON.stringify(await inspectContent(url))}]}));return s}
app.get("/",(_q,r)=>r.json({ok:true,service:"Instagram Competitor Analyzer Browser"}));app.get("/health",(_q,r)=>r.json({ok:true}));
app.use("/mcp",(req,res,next)=>{const t=process.env.MCP_TOKEN;if(t&&req.headers.authorization!==`Bearer ${t}`)return res.status(401).json({error:"Unauthorized"});next()});
app.post("/mcp",async(req,res)=>{const s=make(),t=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});res.on("close",()=>{t.close().catch(()=>{});s.close().catch(()=>{})});await s.connect(t);await t.handleRequest(req,res,req.body)});
app.listen(Number(process.env.PORT||3000),"127.0.0.1",()=>console.log("MCP: http://127.0.0.1:3000/mcp"));