import { NextResponse } from 'next/server';
import os from 'os';

// Prevents caching of this route
export const dynamic = 'force-dynamic';

let previousCpuTimes = os.cpus().map(cpu => cpu.times);

export async function GET() {
  try {
    const currentCpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    
    // Calculate accurate CPU usage across all cores based on interval difference
    let idleDifference = 0;
    let totalDifference = 0;
    
    for (let i = 0; i < currentCpus.length; i++) {
      const currentTimes = currentCpus[i].times;
      const previousTimes = previousCpuTimes[i];
      
      for (const type in currentTimes) {
        // @ts-ignore
        totalDifference += currentTimes[type] - previousTimes[type];
      }
      idleDifference += currentTimes.idle - previousTimes.idle;
    }
    
    // Update previous times for the next request
    previousCpuTimes = currentCpus.map(cpu => cpu.times);

    // If totalDifference is 0 (requests are too fast), return 0 or calculate differently.
    const cpuUsage = totalDifference === 0 ? 0 : 100 - Math.round((100 * idleDifference) / totalDifference);

    return NextResponse.json({
      cpu: Math.max(0, Math.min(100, cpuUsage)), // Ensure it stays within 0-100
      gpu: Math.floor(Math.random() * 40) + 10, // Mock GPU as Node OS doesn't easily provide this
      ram: ((totalMem - freeMem) / (1024 ** 3)), // Used RAM in GB
      totalRam: (totalMem / (1024 ** 3)), // Total RAM in GB
      vram: 8.5, // Mock VRAM
      temp: 45 + Math.random() * 10, // Mock Temp
      networkIn: Math.random() * 5,
      networkOut: Math.random() * 2,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch OS metrics' }, { status: 500 });
  }
}
