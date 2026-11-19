# 🧮 CALCULAMELA

Calculadora científica moderna, rápida y accesible, hecha con **React + TypeScript** y **math.js**. Incluye historial, memoria, vista previa en vivo, tema claro/oscuro, conversor de unidades y conversor de bases numéricas.

**🔗 Demo en vivo:** [calculamela-uotb.vercel.app](https://calculamela-uotb.vercel.app)

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![math.js](https://img.shields.io/badge/math.js-15-E34F26)
![Vitest](https://img.shields.io/badge/tests-Vitest-6E9F18?logo=vitest&logoColor=white)
![Vercel](https://img.shields.io/badge/deploy-Vercel-000000?logo=vercel&logoColor=white)

## ✨ Funcionalidades

### Calculadora científica
- Operaciones básicas, paréntesis (se cierran solos al calcular), `%` y cambio de signo `±`.
- Potencias y raíces: `x²`, `x³`, `xʸ`, `10ˣ`, `eˣ`, `√x`, `∛x` y raíz enésima `root(x, n)`.
- Logaritmos: `ln`, `log` (base 10) y logaritmo en cualquier base `logb(x, base)`.
- Trigonometría: `sin`, `cos`, `tan`, sus inversas y sus versiones hiperbólicas.
- Modo **DEG / RAD** con conversión correcta (`sin(30)` en DEG = `0.5`, `cos(90)` = `0`).
- Constantes `π` y `e`, factorial `n!`, valor absoluto `|x|`, inverso `1/x` y `mod`.
- Tecla **2nd** para alternar a las funciones inversas y **hyp** para las hiperbólicas.
- **Ans** (último resultado) y memoria **MC · MR · M+ · M−**.
- **Vista previa en vivo** del resultado mientras escribes.
- Resultados precisos (sin artefactos tipo `0.1 + 0.2 = 0.30000000000000004`).
- Mensajes de error claros en español (división entre cero, dominio inválido, sintaxis…).
- **Historial** persistente: toca una operación para reutilizarla o inserta su resultado.
- Copiar el resultado al portapapeles con un clic.

### Extras
- 📐 **Conversor de unidades**: longitud, masa, temperatura, volumen, área, velocidad, tiempo, datos y presión.
- 🔢 **Conversor de bases**: binario, octal, decimal y hexadecimal (enteros de cualquier tamaño).
- 🌗 Tema claro / oscuro (recuerda tu preferencia).
- 📱 Diseño responsive pensado para móvil.
- ♿ Accesible: etiquetas ARIA, foco visible y uso completo con teclado.

## ⌨️ Atajos de teclado

| Tecla | Acción |
| --- | --- |
| `0`–`9`, `.` | Números y punto decimal |
| `+` `-` `*` `/` `^` | Operadores |
| `(` `)` `,` | Paréntesis y separador de argumentos |
| `%` · `!` | Porcentaje · factorial |
| `Enter` o `=` | Calcular |
| `Backspace` | Borrar el último elemento |
| `Escape` o `Supr` | Borrar todo |
| `s` `c` `t` | `sin` `cos` `tan` (respetan 2nd / hyp) |
| `l` · `g` · `r` | `ln` · `log` · `√` |
| `p` · `e` · `a` | `π` · `e` · `Ans` |
| `m` | `mod` |
| `i` · `h` · `d` | Alternar 2nd · hyp · DEG/RAD |

## 🚀 Ejecutar en local

Requisitos: **Node.js 20.19+** y npm.

```bash
git clone https://github.com/alejo234506/CALCULAMELA.git
cd CALCULAMELA
npm install
npm run dev        # servidor de desarrollo en http://localhost:5173
```

Otros comandos:

```bash
npm test           # pruebas unitarias (Vitest)
npm run build      # compilación de producción en dist/
npm run preview    # sirve la compilación localmente
```

## 🗂️ Estructura

```
src/
├── App.tsx                 # Cabecera, pestañas, tema y notificaciones
├── components/
│   ├── Calculator.tsx      # Calculadora científica, teclado y atajos
│   ├── History.tsx         # Panel de historial
│   ├── UnitConverter.tsx   # Conversor de unidades
│   └── BaseConverter.tsx   # Conversor de bases
├── lib/
│   ├── engine.ts           # Motor de evaluación (math.js, DEG/RAD, %, errores)
│   ├── converters.ts       # Unidades y bases numéricas
│   └── storage.ts          # localStorage seguro y portapapeles
└── styles.css
```

> La evaluación se hace con el parser de math.js (nunca con `eval`) y las funciones peligrosas como `import` están bloqueadas.

