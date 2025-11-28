import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, complaint, is_anonymous } = await req.json();

    // Validate input
    if (!complaint || complaint.trim().length < 10) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Complaint text is required and must be at least 10 characters' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine if anonymous
    const isAnonymous = is_anonymous === true || !name || name.trim() === '' || name.toLowerCase() === 'anonymous';

    console.log('Processing complaint submission:', { 
      hasName: !!name, 
      isAnonymous, 
      complaintLength: complaint.length 
    });

    // Use Lovable AI to generate title and clean description
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a complaint processing assistant. Given a complaint text from a voice conversation, you must:
1. Generate a concise, professional title (max 80 characters) that summarizes the main issue
2. Clean up and format the description to be clear and professional while preserving the original meaning

Respond ONLY with valid JSON in this exact format:
{"title": "...", "description": "..."}`
          },
          {
            role: 'user',
            content: `Process this complaint:\n\n${complaint}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded, please try again later' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Service temporarily unavailable' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI processing failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI response:', aiContent);

    // Parse AI response
    let title = 'Voice Complaint';
    let description = complaint;
    
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        title = parsed.title || title;
        description = parsed.description || description;
      }
    } catch (parseError) {
      console.error('Failed to parse AI response, using defaults:', parseError);
    }

    // Ensure title is not too long
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert complaint into database
    const { data: complaintData, error: insertError } = await supabase
      .from('complaints')
      .insert({
        title,
        description,
        is_anonymous: true, // All webhook complaints are anonymous (no auth)
        user_id: null, // No user ID for webhook submissions
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Failed to save complaint: ${insertError.message}`);
    }

    console.log('Complaint saved successfully:', complaintData.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Complaint submitted successfully',
        complaint_id: complaintData.id,
        title,
        is_anonymous: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
