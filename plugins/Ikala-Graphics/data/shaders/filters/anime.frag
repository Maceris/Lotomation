#version 400

in vec2 outTextCoord;
out vec4 color;

uniform sampler2D screenTexture;

mat3 sx = mat3( 
    1.0, 2.0, 1.0, 
    0.0, 0.0, 0.0, 
   -1.0, -2.0, -1.0 
);
mat3 sy = mat3( 
    1.0, 0.0, -1.0, 
    2.0, 0.0, -2.0, 
    1.0, 0.0, -1.0 
);

float step(float value) {
	int steps = 8;
	return floor(value * steps + 0.5) / steps;
}

void main()
{
    vec3 diffuse = texture(screenTexture, outTextCoord.st).rgb;
    mat3 I;
    for (int i=0; i<3; i++) {
        for (int j=0; j<3; j++) {
            vec3 pix  = texelFetch(screenTexture, ivec2(gl_FragCoord) + ivec2(i-1,j-1), 0).rgb;
            I[i][j] = length(pix); 
		}
	}

	float gx = dot(sx[0], I[0]) + dot(sx[1], I[1]) + dot(sx[2], I[2]); 
	float gy = dot(sy[0], I[0]) + dot(sy[1], I[1]) + dot(sy[2], I[2]);

	float g = sqrt(pow(gx, 2.0)+pow(gy, 2.0));
	
	if (g > 0.3) {
		g = 1.0;
	}
	else {
		g = 0.0;
	}
	
	diffuse.r = step(diffuse.r);
	diffuse.g = step(diffuse.g);
	diffuse.b = step(diffuse.b);
	
	color = vec4(diffuse - vec3(g), 1.0);

} 