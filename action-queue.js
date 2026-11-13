// One farmer, one action at a time. Duplicate pending taps share their job.
export class FarmerActionQueue {
 constructor(perform){this.perform=perform;this.jobs=[];this.pending=new Map();this.running=false}
 enqueue(action,target){const key=`${action}:${target.column}:${target.row}`;if(this.pending.has(key))return this.pending.get(key);
  let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});this.pending.set(key,promise);
  this.jobs.push({action,target:{...target},key,resolve,reject});this.drain();return promise;
 }
 async drain(){if(this.running)return;this.running=true;
  while(this.jobs.length){const job=this.jobs.shift();try{await this.perform(job.action,job.target);job.resolve()}catch(error){job.reject(error)}finally{this.pending.delete(job.key)}}
  this.running=false;
 }
}
