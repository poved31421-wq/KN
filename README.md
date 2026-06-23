# Dashboard Operativo de Diligencias

Dashboard web para visualizar operaciones de diligencias en tiempo real desde Google Sheets.

## Archivos

- `index.html`: interfaz principal.
- `styles.css`: estilos de diseño corporativo.
- `script.js`: lógica de conexión a Google Sheets y visualización.
- `serve.ps1`: (opcional) script PowerShell para iniciar un servidor HTTP local si tienes Python.

## Cómo ejecutar (Opciones)

Abre una terminal en `c:\Users\Quick\Desktop\KN` y usa una de las siguientes opciones:

1) Usar VS Code - Live Server (recomendado si usas VS Code)

	- Instala la extensión **Live Server**
	- Abre la carpeta en VS Code y haz clic en `Go Live` (esquina inferior derecha)
	- Abre `http://127.0.0.1:5500` o la URL que Live Server muestre.

2) Usar Python 3 (rápido y sin dependencias extra)

	PowerShell:
	```powershell
	cd C:\Users\Quick\Desktop\KN
	python -m http.server 8000
	# o si tu sistema usa 'py':
	py -3 -m http.server 8000
	```

	Luego abre en el navegador:
	```text
	http://localhost:8000/index.html
	```

3) Usar Node.js (`http-server` con npx)

	Si tienes Node.js instalado:
	```powershell
	cd C:\Users\Quick\Desktop\KN
	npx http-server -p 8000
	```

4) Script PowerShell incluido (intenta Python automáticamente)

	En PowerShell ejecuta:
	```powershell
	cd C:\Users\Quick\Desktop\KN
	.\serve.ps1
	```

## Notas importantes

- No abras `index.html` directamente con `file://` — el navegador bloquea las solicitudes `fetch` externas. Usa alguno de los métodos anteriores.
- Si el dashboard no carga datos, verifica que la hoja de Google Sheets esté publicada y accesible (la URL CSV debe ser pública).
- Para publicar cambios en GitHub Pages (ya lo publicaste en `https://poved31421-wq.github.io/KN/`), confirma que la rama `main` está configurada como fuente en Settings → Pages.

## Requisitos

- Navegador moderno con soporte `fetch`.
- Conexión a Internet.
