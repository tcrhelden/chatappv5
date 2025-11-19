Stappen om een Node.js-project te starten
1. Installeer Node.js
Ga naar de officiële website Nodejs.org en download de nieuwste stabiele versie van Node.js. Installeer deze op je computer zodat je de Node-omgeving en npm (Node Package Manager) kunt gebruiken.

2. Navigeer naar de projectmap
Open de opdrachtprompt of terminal en ga naar de map waar je projectbestanden staan.
Voorbeeld:
cd pad/naar/jouw/projectmap

3. Installeer de dependencies
Een Node-project bevat meestal een package.json-bestand met alle benodigde pakketten.
Voer in de terminal uit:
npm install

Hiermee worden alle dependencies automatisch gedownload en geïnstalleerd.

4. Project starten
Nadat alle dependencies zijn geïnstalleerd, kun je het project starten met:
npm start

5. OpenAI API-sleutel toevoegen
Je OpenAI API-sleutel kun je vinden op:
https://platform.openai.com/api-keys

Plaats deze sleutel in een nieuw bestand genaamd .env in je projectmap.
Voorbeeld van inhoud van .env:
OPENAI_API_KEY=your_api_key_here

