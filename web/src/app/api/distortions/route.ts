import jsonParser from "~/utils/json-parser";

const fs = require("fs").promises;

const { GoogleGenerativeAI } = require("@google/generative-ai");
const GEMINI_TOKEN = process.env.NEXT_GEMINI_TOKEN;

const genAI = new GoogleGenerativeAI(GEMINI_TOKEN);

const wait = (ms) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });

const backstoriesSchema = [
  {
    type: "message",
    text: "Pagi ini, aku membuka mata dengan perasaan enggan. Semangat untuk beraktivitas telah sirna, tergantikan oleh rasa lelah dan putus asa.",
    skippable: true,
  },
  {
    type: "message",
    text: "Bangun dari tempat tidur terasa bagaikan mendaki gunung Everest. Setiap langkah terasa berat, dan setiap tarikan napas terasa sesak.",
    skippable: true,
  },
  {
    type: "message",
    text: "Dulu, aku selalu bersemangat untuk pergi ke kampus. Aku senang bertemu teman-teman, mengikuti perkuliahan, dan berdiskusi dengan dosen. Namun, kini semua itu terasa hampa. Aku kehilangan minat pada semua hal, termasuk kuliah. Aku lebih memilih untuk mengurung diri di kamar, tenggelam dalam lautan kesedihan dan pikiran negatif.",
    skippable: true,
  },
];

const quizzesSchema = {
  /**
   * Contoh Pertanyaan
   */
  text: "Aku menerima nilai bagus pada tugasku tetapi sesungguhnya itu ujian yang mudah, atau guru hanya bersikap baik kepada aku.'", // Translated text
  /**
   * Index Kunci Jawaban
   */
  answer: 3, // Index dari kunci jawaban

  /**
   * Jenis jenis cara berfikir terdistorsi yang terkandung
   */
  options: [
    "Mind Reading",
    "Minimization",
    "Emotional Reasoning",
    "Discounting the Positive",
  ],

  /**
   * Jenis jenis response berdasarkan benar atau tidaknya jawaban
   */
  response: {
    correct: {
      type: "message",
      text: "Kamu berhasil menyerang dia, Pikiran 'Discounting The Positive' membuatnya hanya bisa melihat situasi buruh. Penting untuk tetap rasional,krisis dan realistis.",
      skippable: true,
    },
    wrong: {
      type: "message",
      text: "Jawaban kamu salah, dia berhasil menyerangmu. Pikiran 'Discounting The Positive' adalah jawaban yang benar. Mari kita coba lagi!",
      skippable: true,
    },
  },
};

const generatePrompts = ({ qty = 10, journal = "" }) => {
  return [
    journal,
    `Analisa dan ekstrak keyword yang mengandung indikasi pikiran terdistorsi`,
    `Buat ${qty} backstories dengan berdasarkan informasi diatas`,
    `Pecah backstories jadi 3 atau 4 bagian lalu populate dan tampilkan dalam format json berikut;
      <JSONSchema>
        ${JSON.stringify({
          enemies: [
            { backstories: backstoriesSchema },
            { backstories: backstoriesSchema },
          ],
        })}
      </JSONSchema>
    `,
    `Buat 3 - 5 quis dari backstories tersebut`,
    `Gabungkan quiz dan backstories lalu tampilkan dalam format skema JSON berikut;
      <JSONSchema>
        ${JSON.stringify({
          backstories: backstoriesSchema,
          quizzes: quizzesSchema,
        })}
      </JSONSchema>
    `,
  ].join("\n");
};

export async function GET(request: Request) {
  return Response.json({ message: "Dont make any sound" });
}

export async function POST(request: Request) {
  const body = await request.json();

  try {
    // const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    // const prompt = generatePrompts({
    //   qty: 10,
    //   journal: body?.journal,
    // });

    // const result = await model.generateContent(prompt);
    // const response = await result.response;

    await wait(1500);
    const jsonData = jsonParser(body?.journal);

    return Response.json({ data: jsonData });
  } catch (error) {
    console.error(error);
    return Response.json({
      message: "Something is wrong",
    });
  }
}
