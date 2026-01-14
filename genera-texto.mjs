import fs from "fs/promises";

async function main() {
    if (process.argv.length < 3) {
        console.error("Uso: node genera-texto.mjs <file>");
        process.exit(1);
    }
    
    const audioPath = process.argv[2];
    
    try {
        await fs.access(audioPath);
    } catch {
        console.error("✗ Archivo no encontrado:", audioPath);
        process.exit(1);
    }
    
    const extension = audioPath.split('.').pop().toLowerCase();
    const mimeTypes = {
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        webm: 'audio/webm'
    };
    
    const mime = mimeTypes[extension];
    if (!mime) {
        console.error("Tipo de archivo no soportado:", extension);
        process.exit(1);
    }
    
    try {
        const audioBuffer = await fs.readFile(audioPath);
        const audioFile = new File([audioBuffer], audioPath, { type: mime });
        const form = new FormData();
        form.append('file', audioFile);
        
        const res = await fetch('http://localhost:3000/api/audio-to-text', {
            method: 'POST',
            body: form,
        });
        
        if (!res.ok) {
            const errorText = await res.text();
            console.error("Error en la transcripción:", errorText);
            process.exit(1);
        }
        
        const data = await res.json();
        console.log(data.text);
    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    }
}

main();