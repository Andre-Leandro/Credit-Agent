import { useState, useCallback } from 'react';

interface ChatRequest {
  message: string;
  files?: File[];
}

interface ChatResponse {
  success: boolean;
  message: string;
  error?: string;
}

// Convertir archivo a base64 (sin prefijo)
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extraer solo la parte base64 sin el prefijo "data:image/...;base64,"
      const base64String = result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const useChatAgent = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (request: ChatRequest): Promise<ChatResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const lambdaUrl = import.meta.env.VITE_LAMBDA_URL;

      if (!lambdaUrl) {
        throw new Error('VITE_LAMBDA_URL no está configurada en las variables de entorno');
      }

      // Obtener el usuario del localStorage
      const userString = localStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;
      const dni = user?.dni;

      // Preparar payload base
      const payload: any = {
        prompt: request.message,
      };

      // Agregar DNI y email si existen
      if (dni) {
        payload.dni = dni;
      }
      if (user?.email) {
        payload.email = user.email;
      }

      // Si hay imágenes, convertir a base64
      if (request.files && request.files.length > 0) {
        const imageFile = request.files[0]; // Tomar la primera imagen
        const mimeType = imageFile.type;

        if (mimeType.startsWith('image/')) {
          const base64String = await fileToBase64(imageFile);
          payload.image = base64String;
          console.log('🖼️ Imagen convertida a base64, tipo:', mimeType);
        }
      }

      console.log('📤 Enviando a Lambda:', {
        prompt: payload.prompt,
        hasImage: !!payload.image,
      });

      const response = await fetch(lambdaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📥 Status de respuesta:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = `Error ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = await response.text() || errorMessage;
        }

        console.error('❌ Error del servidor:', errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Respuesta de Lambda:', data);

      if (!data.result) {
        throw new Error('Respuesta inválida del agente: falta el campo "result"');
      }

      return {
        success: true,
        message: data.result,
      };
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : 'No pudimos conectar con el agente. Por favor, intenta de nuevo.';

      console.error('🚨 Error en hook:', errorMessage);
      setError(errorMessage);

      return {
        success: false,
        message: '',
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { sendMessage, isLoading, error };
};
