const express = require("express");
const bodyParser = require("body-parser");
const puppeteer = require("puppeteer");
const hbs = require("handlebars");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static("public"));

const loadTemplate = (templateName) => {
  const templatePath = path.join(__dirname, `templates/${templateName}.hbs`);
  const template = fs.readFileSync(templatePath, "utf-8");
  return hbs.compile(template);
};

app.post("/generate-resume", async (req, res) => {
  const { name, contact, email, website, address, education, experience, skills, imageUrl, summary, selectedTemplate } = req.body;

  if (!name || !contact || !email || !website || !address || !education || !experience || !skills || !summary || !selectedTemplate) {
    return res.status(400).send("All fields are required.");
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=egl'],
      ignoreHTTPSErrors: true,
      timeout: 60000,
    });
    const page = await browser.newPage();

    const template = loadTemplate(selectedTemplate);
    const htmlContent = template({ name, contact, email, website, address, education, experience, skills, imageUrl, summary });

    await page.setContent(htmlContent);
    await page.waitForSelector('body');

    const pdf = await page.pdf({ format: 'A4', timeout: 30000 });

    await browser.close();

    const pdfPath = path.join(__dirname, "generated-resume.pdf");
    await fs.promises.writeFile(pdfPath, pdf);

    res.contentType("application/pdf");
    res.setHeader('Content-Disposition', 'attachment; filename=resume.pdf');
    const readStream = fs.createReadStream(pdfPath);
    readStream.pipe(res);
  } catch (err) {
    console.log(err.message)
    res.status(500).send("Error generating resume.");
  }
});

app.listen(PORT, () => {
  console.log(`Server running at ${PORT} port`);
});
