import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configurações do Nodemailer
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export async function sendEmail(to: string, name: string, safeName: string, path: string) {
    const mailOptions = {
      from: "App PitStop" + process.env.GOOGLE_EMAIL,
      to,
      subject: "Relatório Pit Stop Golf",
      text: `Olá ${name}, segue o seu relatório do Pit Stop Golf.`,
      attachments: [
        {
          filename: `Relatorio_${safeName}.pdf`,
          path
        }
      ]
    };
  
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Email enviado: ' + info.response);
      return info;
    } catch (error) {
      console.log(error);
      throw error; // Re-lançar o erro
    }
  }