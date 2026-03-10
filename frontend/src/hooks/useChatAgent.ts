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

export const useChatAgent = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (request: ChatRequest): Promise<ChatResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const lambdaUrl = 'https://ex2neaqezalia5hgololek4wra0kaknv.lambda-url.us-east-1.on.aws/';

      // Construir el prompt incluyendo archivos si existen
      let prompt = request.message;
      
      if (request.files && request.files.length > 0) {
        prompt += `\n\n📎 Archivos adjuntos: ${request.files.map(f => f.name).join(', ')}`;
      }

      const payload = {
        prompt: prompt,
      };

      console.log('📤 Enviando a Lambda:', payload);

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
