import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
export function parseProcesses(output, platform = process.platform) {
  if(platform === 'win32') {
    const rows=JSON.parse(output.trim()||'[]');
    return (Array.isArray(rows)?rows:[rows]).map(row=>({pid:row.ProcessId,command:row.CommandLine||''}));
  }
  return output.split('\n').flatMap(line=>{const m=/^\s*(\d+)\s+(.+)$/.exec(line);return m?[{pid:Number(m[1]),command:m[2]}]:[];});
}
export function processes() {
  const windows=process.platform==='win32';
  const output=execFileSync(windows?'powershell.exe':'ps',windows?['-NoProfile','-NonInteractive','-Command',"[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; @(Get-CimInstance Win32_Process | Select-Object ProcessId,CommandLine) | ConvertTo-Json -Compress"]:['-ax','-o','pid=,command='],{encoding:'utf8',windowsHide:true,timeout:15000,maxBuffer:8*1024*1024});
  return parseProcesses(output.replace(/^\uFEFF/,''));
}
export function instanceMembers(state, root, list = processes()) {
  if(!state || state.root!==root || typeof state.token!=='string' || !/^[a-zA-Z0-9-]{8,80}$/.test(state.token))return [];
  const scripts=['tools/run.mjs','server/api.mjs','server/worker.mjs','server/job.mjs'].map(p=>resolve(root,p));
  return list.filter(({command})=>{
    // Windows quotes paths with spaces. Match complete arguments, not substrings.
    const args=[...command.matchAll(/"([^"]*)"|'([^']*)'|([^\s]+)/g)].map(m=>m[1]??m[2]??m[3]);
    // POSIX ps removes argv quoting, including around paths containing spaces.
    const scriptMatch=scripts.some(p=>args.includes(p)||new RegExp(`(?:^|[\\s"'])${p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?=$|[\\s"'])`).test(command));
    return args.includes(`--instance=${state.token}`)&&scriptMatch;
  }).map(p=>p.pid);
}
