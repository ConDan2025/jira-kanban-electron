
const { contextBridge } = require('electron');
const keytar = require('keytar');
const axios = require('axios');

const SERVICE = 'JiraKanbanApp';
const ACCOUNT = 'jira-pat';

async function jqlSearch(jiraUrl, pat, jql, fields, maxResults = 200) {
  const resp = await axios.get(`${jiraUrl.replace(/\/$/, '')}/rest/api/2/search`, {
    headers: { Authorization: `Bearer ${pat}` },
    params: { jql, fields, maxResults }
  });
  return resp.data;
}

contextBridge.exposeInMainWorld('api', {
  getPAT: async () => {
    return await keytar.getPassword(SERVICE, ACCOUNT);
  },
  savePAT: async (pat) => {
    await keytar.setPassword(SERVICE, ACCOUNT, pat);
    return true;
  },
  clearPAT: async () => {
    await keytar.deletePassword(SERVICE, ACCOUNT);
    return true;
  },
  fetchMyWork: async (jiraUrl, project, issuetype, user) => {
    const pat = await keytar.getPassword(SERVICE, ACCOUNT);
    if (!pat) throw new Error('No PAT stored');

    // 1) Fetch subtasks assigned to user
    const jqlSub = `project = "${project}" AND issuetype = "Sub-task" AND assignee = "${user}" ORDER BY Rank ASC`;
    const subData = await jqlSearch(jiraUrl, pat, jqlSub, "key,summary,assignee,status,parent", 500);
    const subtasks = subData.issues || [];

    // 2) Collect parent keys and filter to Solution Initiatives
    const parentKeys = new Set();
    const subsByParent = {};
    for (const sub of subtasks) {
      const parent = sub.fields.parent;
      if (!parent) continue;
      const parentType = parent.fields?.issuetype?.name || parent.fields?.issuetype?.id || '';
      // If parent fields are not expanded, we'll re-query parents anyway. Filter later.
      parentKeys.add(parent.key);
      if (!subsByParent[parent.key]) subsByParent[parent.key] = [];
      subsByParent[parent.key].push({
        key: sub.key,
        summary: sub.fields.summary,
        status: sub.fields.status?.name || ''
      });
    }

    if (parentKeys.size === 0) {
      return { columns: {}, initiativesOrdered: [], subtasksByParent: {} };
    }

    // 3) Fetch parents (initiatives) by keys in Rank order
    const parentKeyList = Array.from(parentKeys).join(',');
    const jqlParents = `project = "${project}" AND key in (${parentKeyList}) AND issuetype = "${issuetype}" ORDER BY Rank ASC`;
    const parentData = await jqlSearch(jiraUrl, pat, jqlParents, "key,summary,status,issuetype", 500);
    const parents = parentData.issues || [];

    // 4) Group by initiative status, keep order from parentData (already Rank ASC)
    const columns = {};
    const initiativesOrdered = [];
    for (const p of parents) {
      const st = p.fields.status?.name || 'Unknown';
      if (!columns[st]) columns[st] = [];
      columns[st].push({ key: p.key, summary: p.fields.summary, status: st });
      initiativesOrdered.push(p.key);
    }

    return { columns, initiativesOrdered, subtasksByParent: subsByParent };
  }
});
