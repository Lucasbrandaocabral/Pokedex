// ====================================================
// Autenticação de 2 fatores por app autenticador (TOTP)
// Compatível com Google Authenticator, Authy, Microsoft Authenticator etc.
// ====================================================
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

const criar = (usuario, segredo) =>
    new OTPAuth.TOTP({
        issuer: "Pokédex Pocket",
        label: usuario,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(segredo),
    });

export const novoSegredo = () => new OTPAuth.Secret({ size: 20 }).base32;

// Dados para a pessoa cadastrar a conta no app (QR code + chave para digitar)
export const dadosConfiguracao = async (usuario, segredo) => {
    const uri = criar(usuario, segredo).toString();
    return { segredo, qr: await QRCode.toDataURL(uri, { margin: 1, width: 240 }) };
};

// Retorna o número do intervalo de 30s do código (para impedir reuso) ou null se inválido
export const validarCodigo = (usuario, segredo, codigo) => {
    const delta = criar(usuario, segredo).validate({ token: codigo, window: 1 });
    if (delta === null) return null;
    return Math.floor(Date.now() / 30000) + delta;
};
