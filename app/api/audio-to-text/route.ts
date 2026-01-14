import { NextRequest, NextResponse } from "next/server";
import { createPartFromUri, createUserContent, GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
    try {
        const apyKey = process.env.GOOGLE_API_KEY;
        const ai= new GoogleGenAI({apiKey:apyKey})

        //obtener el archivo de audio del cuerpo de la solicitud
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "no se proporcionó un archivo" }, { status: 400 });
        }

        // Subir el archivo temporalmente usando la API de Google GenAI
        const myFile= await ai.files.upload({
            file: file,
            config: {mimeType: file.type}
        })

        // Verificamos que uri y mimeType existan en myFile
        if(!myFile.uri || !myFile.mimeType){
            throw new Error("Error al subir el archivo: falta uri o mimeType");
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents:createUserContent([createPartFromUri(myFile.uri, myFile.mimeType)]),
        })

        return NextResponse.json({ text: response.text});

    }
    catch (error) {
        console.error("Error processing audio to text:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }}