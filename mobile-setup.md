# Alpha 3D Mobile Setup

## iOS com Capacitor

Base nativa preparada neste projeto:

- Dependencias do Capacitor instaladas
- Projeto iOS criado em `ios/`
- Assets web sincronizados a partir de `out/`
- Bundle id configurado como `com.alpha3d.studio`
- Nome nativo configurado como `Alpha 3D Studio`

### Comandos disponiveis

```bash
npm run build:mobile
npm run cap:sync
npm run cap:add:ios
npm run cap:sync:ios
npm run cap:open:ios
```

### Fluxo no macOS

1. Instale Xcode e CocoaPods.
2. Rode `npm install`.
3. Rode `npm run cap:sync:ios`.
4. Rode `npm run cap:open:ios`.
5. No Xcode, selecione um simulador ou dispositivo e gere o app.

### Observacao

No Windows e possivel preparar e sincronizar o projeto iOS, mas a compilacao final e a assinatura do app precisam ser feitas no macOS.