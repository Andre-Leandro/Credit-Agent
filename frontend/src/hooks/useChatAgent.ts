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

// Comprimir imagen si es muy grande
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    // Si es menor a 1MB, no comprimir
    if (file.size < 1024 * 1024) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Reducir dimensiones si es muy grande
          const maxWidth = 1920;
          const maxHeight = 1440;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
          }

          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo crear contexto de canvas'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Convertir a blob con compresión JPEG
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('No se pudo comprimir la imagen'));
                return;
              }

              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });

              const originalSize = (file.size / 1024 / 1024).toFixed(2);
              const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(2);
              console.log(`📦 Imagen comprimida: ${originalSize}MB → ${compressedSize}MB`);

              resolve(compressedFile);
            },
            'image/jpeg',
            0.85 // Calidad JPEG del 85% (buen balance)
          );
        };

        img.onerror = () => {
          reject(new Error('No se pudo cargar la imagen'));
        };

        img.src = event.target?.result as string;
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsDataURL(file);
  });
};

// Convertir archivo a base64 (sin prefijo)
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Validar tamaño (máximo 15MB después de compresión)
    const MAX_SIZE = 15 * 1024 * 1024; // 15MB
    if (file.size > MAX_SIZE) {
      reject(new Error(`Imagen aún muy grande: ${(file.size / 1024 / 1024).toFixed(2)}MB. Máximo permitido: 15MB`));
      return;
    }

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      reject(new Error(`Tipo de archivo no soportado: ${file.type}. Usa JPG, PNG, GIF o WebP`));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = () => {
      try {
        const result = reader.result as string;
        // Extraer solo la parte base64 sin el prefijo "data:image/...;base64,"
        const parts = result.split(',');
        
        if (parts.length !== 2) {
          throw new Error('Formato de imagen inválido');
        }
        
        const base64String = parts[1];
        
        if (!base64String || base64String.length === 0) {
          throw new Error('No se pudo convertir la imagen a base64');
        }
        
        console.log(`✅ Imagen convertida: ${file.name} (${(file.size / 1024).toFixed(2)}KB)`);
        resolve(base64String);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Error desconocido al procesar imagen'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error(`Error al leer el archivo: ${file.name}`));
    };
    
    reader.onabort = () => {
      reject(new Error(`Lectura cancelada: ${file.name}`));
    };
    
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

      // Si hay imágenes, comprimir y convertir a base64
      if (request.files && request.files.length > 0) {
        const imageFiles = request.files.filter((file) => file.type.startsWith('image/'));
        
        if (imageFiles.length > 0) {
          try {
            console.log('📸 Procesando imágenes...');
            
            // Primero comprimir si es necesario
            const compressedFiles = await Promise.all(
              imageFiles.map(async (imageFile) => {
                try {
                  const compressed = await compressImage(imageFile);
                  return compressed;
                } catch (error) {
                  console.warn(`Advertencia al comprimir ${imageFile.name}:`, error);
                  return imageFile; // Si falla la compresión, usar original
                }
              })
            );

            // Luego convertir a base64
            const base64Images = await Promise.all(
              compressedFiles.map(async (imageFile) => {
                try {
                  const base64String = await fileToBase64(imageFile);
                  return base64String;
                } catch (error) {
                  const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
                  console.error(`❌ Error con imagen ${imageFile.name}:`, errorMsg);
                  throw new Error(`Problema con imagen "${imageFile.name}": ${errorMsg}`);
                }
              })
            );
            payload.images = base64Images;
            console.log('🖼️ Imágenes procesadas, cantidad:', imageFiles.length);
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Error al procesar imágenes';
            console.error('❌ Error procesando imágenes:', errorMsg);
            throw error;
          }
        }
      }

      console.log('📤 Enviando a Lambda:', {
        prompt: payload.prompt,
        hasImages: !!(payload.images && payload.images.length > 0),
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

      // Mensajes personalizados para errores de imagen
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('Imagen muy grande')) {
        userFriendlyMessage = 'Una de tus imágenes es muy grande. Por favor usa imágenes menores a 5MB.';
      } else if (errorMessage.includes('Problema con imagen')) {
        userFriendlyMessage = `❌ No se pudo procesar una imagen: ${errorMessage}`;
      } else if (errorMessage.includes('tipo de archivo')) {
        userFriendlyMessage = 'Formato de imagen no soportado. Usa JPG, PNG, GIF o WebP.';
      }

      return {
        success: false,
        message: '',
        error: userFriendlyMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { sendMessage, isLoading, error };
};
