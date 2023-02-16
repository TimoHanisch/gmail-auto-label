const PAGE_SIZE = 25;
const OPEN_API_GTP_3_URL = "https://api.openai.com/v1/completions";
const OPEN_AI_API_KEY = "<YOUR-OPEN-AI-API-KEY>";
const LABEL_LIST = "Invoice, Private, Information, Advertisement";

function autoLabelSystem() {
  const unreadCount = GmailApp.getInboxUnreadCount();
  const pageCount = Math.ceil(unreadCount / PAGE_SIZE);
  const currentDate = new Date();

  for(let i = 0; i < pageCount; i++) {
    processMails(currentDate, i * PAGE_SIZE, (i + 1) * PAGE_SIZE);
  }
}

function processMails(currentDate, from, to) {
    const unreadThreads = fetchMails(currentDate, from, to);

    unreadThreads.forEach(thread => {
      const threadLabels = thread.getLabels();
      const firstMessage = thread.getMessages()[0];
      const subject = thread.getFirstMessageSubject();
      if (threadLabels.length == 0) {
        const label = fetchLabelRecommendation(subject, firstMessage.getPlainBody());
        console.log(`Add label ${label} to E-Mail with title "${subject}"`);
        attachLabel(thread, label);
      }
    });
}

function fetchMails(currentDate, from, to) {
  const currentTime = currentDate.getTime();
  const startDate = new Date(currentTime - 600000); // less 10 minutes from current time.
  const query = 'after:' + Math.floor(startDate.getTime()/1000);
  return GmailApp.search(query, from, to);
}

function fetchLabelRecommendation(subject, content) {
  const payload = {
    model: "text-davinci-003",
    prompt: getPromptText(subject, content),
    temperature: 0,
    max_tokens: 100,
    top_p: 1,
    frequency_penalty: 0.2,
    presence_penalty: 0
  };
  const options = {
    method : "get",
    contentType : "application/json",
    headers : {
      Authorization : `Bearer ${OPEN_AI_API_KEY}`  
    },
    payload : JSON.stringify(payload)
  };
  const response = UrlFetchApp.fetch(OPEN_API_GTP_3_URL, options);
  const responseJson = response.getContentText();
  const data = JSON.parse(responseJson);
  const text = data.choices[0].text;
  return text.trim();
}

function getPromptText(subject, content) {
  const thousandCharsContent = content.substring(0, Math.min(content.length, 1000));
  return `I want you to choose the best matching label for the text that I will provide at the end of this input starting with $START_MESSAGE$ and ending with $END_MESSAGE$ from the following list ${LABEL_LIST}. Your answer should always consist of one word.\n$START_MESSAGE$${subject} - ${thousandCharsContent}$END_MESSAGE$`;
}

function attachLabel(thread, label) {
  try {
    GmailApp.createLabel(label);
    console.log(`Created new label "${label}"`);
  } finally {
    const gmailLabel = GmailApp.getUserLabelByName(label);
    thread.addLabel(gmailLabel);
  }
}
