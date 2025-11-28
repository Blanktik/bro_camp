import { useEffect } from 'react';

export default function ElevenLabsWidget() {
  useEffect(() => {
    // Load the ElevenLabs script
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.async = true;
    script.type = 'text/javascript';
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src="https://unpkg.com/@elevenlabs/convai-widget-embed"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return (
    // @ts-ignore - Custom element from ElevenLabs
    <elevenlabs-convai agent-id="agent_5701kb5j90hbfease2k6954phmh5"></elevenlabs-convai>
  );
}
