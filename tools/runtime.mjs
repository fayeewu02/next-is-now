import {createRequire} from 'node:module';
import path from 'node:path';
const localRequire=createRequire(import.meta.url);
export function dependency(name){
  try{return localRequire(name);}catch(error){
    if(process.env.NEXT_NOW_MODULE_DIR)return localRequire(path.join(process.env.NEXT_NOW_MODULE_DIR,name));
    throw new Error(`需要测试/导出依赖 ${name}。先在迁移包根目录执行 npm install；网页本身不依赖它。`,{cause:error});
  }
}
export const {chromium}=dependency('playwright');
export const sharp=dependency('sharp');
export const BASE_URL=(process.env.NEXT_NOW_BASE_URL||'http://127.0.0.1:4917').replace(/\/+$/,'');
export const launchOptions={headless:true,...(process.env.NEXT_NOW_BROWSER?{executablePath:process.env.NEXT_NOW_BROWSER}:{})};
