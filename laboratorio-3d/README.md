# NEXO ORBITAL · Laboratório 3D

Página estática de construção, montagem e funcionamento com modelos educativos originais e inspeção de conexões.

[Abrir laboratório](https://perabru.github.io/nexo-orbital-cubesat/laboratorio-3d/)

## Arquivos

- `index.html`: guia completo, acessível também quando WebGL não está disponível.
- `content.json`: etapas, materiais, conexões, testes e referências.
- `models.js`: peças e pontos de conexão em Three.js.
- `viewer.js`: rotação, zoom, seleção, vista desmontada, rótulos e captura PNG.
- `style.css`: apresentação responsiva com a identidade do projeto.
- `vendor/`: Three.js r170 e OrbitControls distribuídos sob a licença MIT incluída.

## Executar localmente

Use um servidor HTTP na raiz do repositório, por exemplo `python -m http.server 8000`, e acesse `http://localhost:8000/laboratorio-3d/`. A abertura por `file://` não permite carregar módulos JavaScript em todos os navegadores.

## Controles

Arraste para girar, use a roda ou gesto de pinça para aproximar e selecione peças na cena ou na lista. O controle de desmontagem separa os componentes e mantém as ligações presas aos respectivos pontos. A página inclui vista frontal, lateral e superior, isolamento de peças, nomes, giro automático, tela cheia e captura PNG. Com foco no canvas: setas para girar, +/− para zoom, E para montar/desmontar e 0 para enquadrar.

O roteiro salva apenas as marcações de etapas neste navegador. Nenhuma informação é enviada a um servidor por este laboratório.

O renderizador principal usa WebGL 2. Quando a aceleração gráfica não está disponível, a mesma geometria é desenhada em Canvas 2D com projeção 3D; os controles permanecem funcionais, com menor taxa de quadros.

## Precisão do modelo

Montagem de referência em solo: ESP32-DevKitC V4 com ESP32-WROOM-32E e breakout BME280 alimentado em 3,3 V. A geometria explica o conjunto; folgas, furações e encaixes precisam ser medidos na placa adquirida antes de fabricar. Painéis laterais são elementos estruturais visuais, sem geração solar no MVP. As formas internas são aproximações educativas documentadas nas fontes de modelagem. Não são CAD oficial de fabricante, projeto certificado, gerber de PCB ou arquivo pronto para impressão/fabricação.

## PCB de integração

**NEXO-CARRIER-A: 84 × 75 × 1,6 mm, FR4, duas camadas.** A placa recebe o DevKitC em dois soquetes de 19 vias e o BME280 em um soquete de seis vias. Inclui quatro testpoints, expansão I²C, três capacitores propostos e janela sob a antena. O modelo mostra ilhas, barris metalizados, 24 vias, quatro furos M3 e serigrafia.

- [Vista superior](pcb-top.svg) · [Vista inferior](pcb-bottom.svg) · [Dimensões, componentes e redes](pcb.json).
- `pcb-spec.js` contém as coordenadas em milímetros usadas por `pcb-kit.js`. A cena usa 10 mm por unidade.
- SDA chega ao GPIO21; SCL, ao GPIO22. VIN do BME recebe 3,3 V. A alimentação entra apenas pelo USB do DevKitC.
- RoundedBoxGeometry, da biblioteca Three.js, arredonda os conectores e corpos. Materiais físicos distinguem máscara, FR4, cerâmica, polímero, estanho e acabamento metálico.

É um estudo de integração: as rotas mostram a topologia, sem ERC/DRC ou arquivos de fabricação. Confirmar footprints, encaixes e capacitores na revisão escolhida. Referências: [DevKitC V4](https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html) e [BME280 #2652](https://www.adafruit.com/product/2652).

## Atualizar

Mantenha a tabela de conexões, os pontos em `models.js` e o conteúdo em `content.json` coerentes. Ao editar o conteúdo, atualize também o HTML estático. Os IDs de partes são estáveis e ligam o modelo às etapas.
