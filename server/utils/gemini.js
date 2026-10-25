const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
let model = null;

function getModel() {
  if (!model) {
    if (!process.env.GEMINI_API_KEY) {
      return null;
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }
  return model;
}

/**
 * Break a complex task into actionable subtasks with time estimates
 */
async function breakdownTask(taskTitle, taskDescription) {
  const gemini = getModel();

  if (!gemini) {
    // Intelligent heuristic breakdown when API key is not configured
    const cleanTitle = (taskTitle || 'Task').trim();
    return [
      { title: `Define requirements & scope for "${cleanTitle}"`, estimatedMinutes: 15, done: false },
      { title: `Draft architectural outline and research approaches`, estimatedMinutes: 25, done: false },
      { title: `Implement core functionality and components`, estimatedMinutes: 45, done: false },
      { title: `Test edge cases and polish user experience`, estimatedMinutes: 20, done: false }
    ];
  }

  const prompt = `You are a productivity expert. Break down the following task into specific, actionable subtasks.

Task: ${taskTitle}
${taskDescription ? `Description: ${taskDescription}` : ''}

Return a JSON array of subtasks. Each subtask should have:
- "title": a clear, concise action item (max 100 chars)
- "estimatedMinutes": realistic time estimate in minutes

Rules:
- Create 3-7 subtasks
- Make each subtask concrete and actionable (start with a verb)
- Time estimates should be realistic (5-120 minutes each)
- Order them logically

Return ONLY valid JSON array, no markdown, no explanation. Example:
[{"title": "Research competitors", "estimatedMinutes": 30}]`;

  const result = await gemini.generateContent(prompt);
  const text = result.response.text().trim();

  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = text;
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  const subtasks = JSON.parse(jsonStr);

  // Validate and sanitize
  if (!Array.isArray(subtasks) || subtasks.length === 0) {
    throw new Error('AI returned invalid subtask format');
  }

  return subtasks.slice(0, 7).map(st => ({
    title: String(st.title || 'Subtask').slice(0, 100),
    estimatedMinutes: Math.min(Math.max(Number(st.estimatedMinutes) || 15, 5), 120),
    done: false
  }));
}

/**
 * Generate productivity insights based on user data
 */
async function generateInsights(userData) {
  const gemini = getModel();

  if (!gemini) {
    // Heuristic insights generator
    const insights = [];
    
    if (userData.streak > 0) {
      insights.push({
        type: 'achievement',
        title: `Impressive ${userData.streak}-Day Flow Streak!`,
        description: `You've built strong consistency. Maintaining daily momentum dramatically compounds long-term output.`,
        icon: '🔥'
      });
    } else {
      insights.push({
        type: 'suggestion',
        title: 'Start a Daily Focus Streak',
        description: 'Complete just one 25-minute focus session today to kickstart your streak and build momentum.',
        icon: '⚡'
      });
    }

    if (userData.overdueTasks > 0) {
      insights.push({
        type: 'warning',
        title: `${userData.overdueTasks} Overdue Task${userData.overdueTasks > 1 ? 's' : ''} Need Attention`,
        description: 'Tackle high-urgency items in the Do First quadrant before starting new initiatives.',
        icon: '⚠️'
      });
    } else {
      insights.push({
        type: 'achievement',
        title: 'Zero Overdue Tasks',
        description: 'All scheduled deadlines are up to date. Excellent workload management.',
        icon: '🎯'
      });
    }

    insights.push({
      type: 'suggestion',
      title: 'Optimize Pomodoro Sprints',
      description: userData.focusMinutes > 60
        ? `Great job logging ${userData.focusMinutes}m of deep work. Remember to take 5-minute pauses between sprints.`
        : 'Aim for two 25-minute focus sessions during your peak energy hours today.',
      icon: '💡'
    });

    return insights;
  }

  const prompt = `You are an AI productivity coach. Analyze this user's productivity data and provide personalized insights.

Data:
- Tasks completed this week: ${userData.tasksCompleted}
- Tasks pending: ${userData.tasksPending}
- Total focus time this week: ${userData.focusMinutes} minutes
- Average daily focus: ${userData.avgDailyFocus} minutes
- Most productive category: ${userData.topCategory || 'N/A'}
- Current streak: ${userData.streak} days
- Completion rate: ${userData.completionRate}%
- Overdue tasks: ${userData.overdueTasks}

Provide exactly 3 insights as a JSON array. Each insight should have:
- "type": one of "achievement", "suggestion", "warning"
- "title": short headline (max 60 chars)
- "description": actionable advice (max 150 chars)
- "icon": one emoji

Return ONLY valid JSON array, no markdown. Example:
[{"type": "achievement", "title": "Great focus streak!", "description": "You've maintained consistent focus sessions. Keep it up!", "icon": "🔥"}]`;

  const result = await gemini.generateContent(prompt);
  const text = result.response.text().trim();

  let jsonStr = text;
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  const insights = JSON.parse(jsonStr);

  if (!Array.isArray(insights)) {
    throw new Error('AI returned invalid insights format');
  }

  return insights.slice(0, 3).map(insight => ({
    type: ['achievement', 'suggestion', 'warning'].includes(insight.type) ? insight.type : 'suggestion',
    title: String(insight.title || 'Insight').slice(0, 60),
    description: String(insight.description || '').slice(0, 150),
    icon: String(insight.icon || '💡').slice(0, 2)
  }));
}

/**
 * Suggest what task to work on next
 */
async function suggestNextTask(tasks) {
  const gemini = getModel();

  if (!gemini) {
    // Intelligent priority sorter: Q1 (priority 1, urgency 1) or nearest deadline
    let bestTask = tasks[0];
    let bestScore = -Infinity;
    const now = Date.now();

    for (const t of tasks) {
      let score = (5 - (t.priority || 3)) * 2 + (5 - (t.urgency || 3)) * 2;
      if (t.deadline) {
        const diffHours = (new Date(t.deadline).getTime() - now) / (1000 * 3600);
        if (diffHours < 24) score += 10;
        else if (diffHours < 72) score += 5;
      }
      if (score > bestScore) {
        bestScore = score;
        bestTask = t;
      }
    }

    return {
      task: bestTask,
      reason: bestTask.deadline
        ? `Has an upcoming deadline (${new Date(bestTask.deadline).toLocaleDateString()}) and high priority ranking.`
        : `Identified as your highest priority action item in the matrix.`
    };
  }

  const taskList = tasks.map((t, i) => 
    `${i + 1}. "${t.title}" - Priority: ${t.priority}/4, Urgency: ${t.urgency}/4, Deadline: ${t.deadline ? new Date(t.deadline).toLocaleDateString() : 'None'}, Category: ${t.category}`
  ).join('\n');

  const prompt = `You are a productivity assistant. Given these pending tasks, recommend which ONE task the user should work on next and explain why in 1-2 sentences.

Tasks:
${taskList}

Return JSON with:
- "taskIndex": the 1-based index of the recommended task
- "reason": brief explanation why (max 120 chars)

Return ONLY valid JSON, no markdown. Example:
{"taskIndex": 1, "reason": "This task has the nearest deadline and high priority."}`;

  const result = await gemini.generateContent(prompt);
  const text = result.response.text().trim();

  let jsonStr = text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  const suggestion = JSON.parse(jsonStr);
  const idx = Math.min(Math.max(Number(suggestion.taskIndex) || 1, 1), tasks.length) - 1;

  return {
    task: tasks[idx],
    reason: String(suggestion.reason || 'This task needs your attention.').slice(0, 120)
  };
}

module.exports = { breakdownTask, generateInsights, suggestNextTask };

