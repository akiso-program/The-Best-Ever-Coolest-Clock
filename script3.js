// wgld.org WebGL2.0 sample.015

(function(){
    'use strict';

    // variables
    var gl, run, canvas, canvasWidth, canvasHeight;
    var imageWidth, imageHeight;
    var mousePosition, isMousedown, clickCount, acceleration;
    canvasWidth = 512;
    canvasHeight = 512;
    imageWidth = 256;
    imageHeight = 256;
    clickCount = 0;

    var VBOArray = [[],[]];
    var position = [];
    var velocity = [];
    var target = [[],[]];

    var makefunc = [make_0,make_1,make_2,make_3,make_4,make_5,make_6,make_7,make_8,make_9];

    window.addEventListener('load', function(){
        var e = document.getElementById('info');

        // canvas initialize
        canvas = document.getElementById('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        mousePosition = [0.0, 0.0];
        isMousedown = false;
        acceleration = 0.0;

        // mousemove event
        canvas.addEventListener('mousedown', function(eve){
            clickCount++;
            isMousedown = true;
            acceleration = 1.0;
            makefunc[clickCount%makefunc.length](target[clickCount%2]);
            VBOArray[0][1] = recreate_vio(VBOArray[0][1],velocity);
            VBOArray[0][2] = recreate_vio(VBOArray[0][2],target[clickCount%2]);
            VBOArray[1][1] = recreate_vio(VBOArray[1][1],velocity);
            VBOArray[1][2] = recreate_vio(VBOArray[1][2],target[clickCount%2]);
        }, false);
        canvas.addEventListener('mouseup', function(eve){
            isMousedown = false;
        }, false);
        canvas.addEventListener('mousemove', function(eve){
            var bound = eve.currentTarget.getBoundingClientRect();
            var x = eve.clientX - bound.left;
            var y = eve.clientY - bound.top;
            mousePosition = [
                x / bound.width * 2.0 - 1.0,
                -(y / bound.height * 2.0 - 1.0)
            ];
        }, false);

        // webgl2 initialize
        gl = canvas.getContext('webgl2');
        if(gl){
            e.textContent = 'ready';
        }else{
            e.textContent = 'webgl2 unsupported';
            console.log('webgl2 unsupported');
            return;
        }

        // window keydown event
        window.addEventListener('keydown', function(eve){
            run = eve.keyCode !== 27;
        }, false);

        // generate imagedata
        var img = new Image();
        img.addEventListener('load', function(){
            var c = document.createElement('canvas');
            var ctx = c.getContext('2d');
            c.width = imageWidth;
            c.height = imageHeight;
            ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
            init();
        }, false);
        img.src = 'lenna.jpg';

        function init(){
            // transform feedback object
            var transformFeedback = gl.createTransformFeedback();
            gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transformFeedback);

            // out variable names
            var outVaryings = ['vPosition', 'vVelocity'];

            // transform out shader
            var vs = create_shader('vs_transform');
            var fs = create_shader('fs_transform');
            var prg = create_program_tf_separate(vs, fs, outVaryings);
            var attStride = [2,2,2];
            var uniLocation = [
                gl.getUniformLocation(prg, 'time'),
                gl.getUniformLocation(prg, 'mousePos'),
                gl.getUniformLocation(prg, 'isMove'),
                gl.getUniformLocation(prg, 'acceleration')
            ];

            // feedback in shader
            vs = create_shader('vs_main');
            fs = create_shader('fs_main');
            var fPrg = create_program(vs, fs);
            var fAttStride = [2,2,2];
            var fUniLocation = [
                gl.getUniformLocation(fPrg, 'vpMatrix'),
                gl.getUniformLocation(fPrg, 'move'),
                gl.getUniformLocation(fPrg, 'ambient')
            ];

            // vertices
            (function(){
                var i, j, m;
                var x, y;
                for(i = 0; i < imageHeight; ++i){
                    y = i / imageHeight * 2.0 - 1.0;
                    for(j = 0; j < imageWidth; ++j){
                        x = j / imageWidth * 2.0 - 1.0;
                        position.push(x, -y);
                        m = Math.sqrt(x * x + y * y);
                        velocity.push(x / m, -y / m );
                        if(j<imageWidth/2){
                            target[0].push(0.5,0.0);
                            target[1].push(0.0,0.5);
                        }else{
                            target[0].push(-0.5,0.0);
                            target[1].push(0.0,-0.5);
                        }
                    }
                }
            })();

            // create vbo
            VBOArray = [
                [
                    create_vbo(position),
                    create_vbo(velocity),
                    create_vbo(target[0])
                ], [
                    create_vbo(position),
                    create_vbo(velocity),
                    create_vbo(target[0])
                ]
            ];

            // matrix
            var mat = new matIV();
            var vMatrix   = mat.identity(mat.create());
            var pMatrix   = mat.identity(mat.create());
            var vpMatrix  = mat.identity(mat.create());
            mat.lookAt([0.0, 0.0, 3.0], [0.0, 0.0, 0.0], [0.0, 1.0, 0.0], vMatrix);
            mat.perspective(60, canvasWidth / canvasHeight, 0.1, 10.0, pMatrix);
            mat.multiply(pMatrix, vMatrix, vpMatrix);

            // flags
            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.CULL_FACE);
            gl.enable(gl.BLEND);
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
            gl.disable(gl.RASTERIZER_DISCARD);

            // setting
            var startTime = Date.now();
            var nowTime = 0;
            var count = 0;
            run = true;
            var ambient = [];
            render();

            function render(){
                nowTime = (Date.now() - startTime) / 1000;

                // mouse move power
                if(isMousedown !== true){
                    acceleration *= 0.95;
                }

                // increment
                ++count;
                var countIndex = count % 2;
                var invertIndex = 1 - countIndex;

                var isMove = isMousedown == true;
                
		        ambient = hsva(count % 360, 1.0, 0.8, 1.0);

                // program
                gl.useProgram(prg);

                // set vbo
                set_attribute(VBOArray[countIndex], attStride);
                gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, VBOArray[invertIndex][0]);
                gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, VBOArray[invertIndex][1]);
                gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 2, VBOArray[invertIndex][2]);

                // begin transform feedback
                gl.enable(gl.RASTERIZER_DISCARD);
                gl.beginTransformFeedback(gl.POINTS);

                // vertex transform
                gl.uniform1f(uniLocation[0], nowTime);
                gl.uniform2fv(uniLocation[1], mousePosition);
                gl.uniform1f(uniLocation[2], isMove);
                gl.uniform1f(uniLocation[3], acceleration);
                gl.drawArrays(gl.POINTS, 0, imageWidth * imageHeight);

                // end transform feedback
                gl.disable(gl.RASTERIZER_DISCARD);
                gl.endTransformFeedback();
                gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
                gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, null);
                gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 2, null);

                // clear
                gl.clearColor(0.0, 0.0, 0.0, 1.0);
                gl.clearDepth(1.0);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                gl.viewport(0, 0, canvasWidth, canvasHeight);

                // program
                gl.useProgram(fPrg);

                // set vbo
                set_attribute(VBOArray[invertIndex], fAttStride);

                // push and render
                gl.uniformMatrix4fv(fUniLocation[0], false, vpMatrix);
                gl.uniform1f(fUniLocation[1], acceleration);
                gl.uniform4fv(fUniLocation[2], ambient);
                gl.drawArrays(gl.POINTS, 0, imageWidth * imageHeight);

                gl.flush();

                // animation loop
                if(run){requestAnimationFrame(render);}
            }
        }
    }, false);

    // utility functions ======================================================
    function create_shader(id){
        var shader;
        var scriptElement = document.getElementById(id);
        if(!scriptElement){return;}
        switch(scriptElement.type){
            case 'x-shader/x-vertex':
                shader = gl.createShader(gl.VERTEX_SHADER);
                break;
            case 'x-shader/x-fragment':
                shader = gl.createShader(gl.FRAGMENT_SHADER);
                break;
            default :
                return;
        }
        gl.shaderSource(shader, scriptElement.text);
        gl.compileShader(shader);
        if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
            return shader;
        }else{
            alert(gl.getShaderInfoLog(shader));
        }
    }

    function create_program(vs, fs){
        var program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if(gl.getProgramParameter(program, gl.LINK_STATUS)){
            gl.useProgram(program);
            return program;
        }else{
            alert(gl.getProgramInfoLog(program));
        }
    }

    function create_program_tf_separate(vs, fs, varyings){
        var program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.transformFeedbackVaryings(program, varyings, gl.SEPARATE_ATTRIBS);
        gl.linkProgram(program);
        if(gl.getProgramParameter(program, gl.LINK_STATUS)){
            gl.useProgram(program);
            return program;
        }else{
            alert(gl.getProgramInfoLog(program));
        }
    }

    function recreate_vio(vbo, data){
        gl.deleteBuffer(vbo);
        var vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        return vbo;
    }

    function create_vbo(data){
        var vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        return vbo;
    }
    function set_attribute(vbo, attS){
        for(var i in vbo){
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);
            gl.enableVertexAttribArray(i);
            gl.vertexAttribPointer(i, attS[i], gl.FLOAT, false, 0, 0);
        }
    }

    var seg_position = [[[-0.1,0.1],[0.1,0.1]],
                        [[-0.1,0.0],[0.1,0.0]],
                        [[-0.1,-0.1],[0.1,-0.1]]];
    var upper_line = seg_position[0];
    var center_line = seg_position[1];
    var bottom_line = seg_position[2];
    var upper_left_line = [seg_position[0][0],seg_position[1][0]];
    var upper_right_line = [seg_position[0][1],seg_position[1][1]];
    var bottom_left_line = [seg_position[1][0],seg_position[2][0]];
    var bottom_right_line = [seg_position[1][1],seg_position[2][1]];

    function make_0(target_buffer){
        var line_num = 6;
        make_line(upper_line,target_buffer,line_num,0);
        make_line(upper_right_line,target_buffer,line_num,1);
        make_line(bottom_right_line,target_buffer,line_num,2);
        make_line(bottom_line,target_buffer,line_num,3);
        make_line(bottom_left_line,target_buffer,line_num,4);
        make_line(upper_left_line,target_buffer,line_num,5);
    }
    function make_1(target_buffer){
        var line_num = 2;
        make_line(upper_right_line,target_buffer,line_num,0);
        make_line(bottom_right_line,target_buffer,line_num,1);
    }
    function make_2(target_buffer){
        var line_num = 5;
        make_line(upper_line,target_buffer,line_num,0);
        make_line(upper_right_line,target_buffer,line_num,1);
        make_line(center_line,target_buffer,line_num,2);
        make_line(bottom_left_line,target_buffer,line_num,3);
        make_line(bottom_line,target_buffer,line_num,4);
    }
    function make_3(target_buffer){
        var line_num = 5;
        make_line(upper_line,target_buffer,line_num,0);
        make_line(upper_right_line,target_buffer,line_num,1);
        make_line(center_line,target_buffer,line_num,2);
        make_line(bottom_right_line,target_buffer,line_num,3);
        make_line(bottom_line,target_buffer,line_num,4);
    }
    function make_4(target_buffer){
        var line_num = 4;
        make_line(upper_right_line,target_buffer,line_num,0);
        make_line(bottom_right_line,target_buffer,line_num,1);
        make_line(upper_left_line,target_buffer,line_num,2);
        make_line(center_line,target_buffer,line_num,3);
    }
    function make_5(target_buffer){
        var line_num = 5;
        make_line(upper_line,target_buffer,line_num,0);
        make_line(upper_left_line,target_buffer,line_num,1);
        make_line(center_line,target_buffer,line_num,2);
        make_line(bottom_right_line,target_buffer,line_num,3);
        make_line(bottom_line,target_buffer,line_num,4);
    }
    function make_6(target_buffer){
        var line_num = 5;
        make_line(upper_left_line,target_buffer,line_num,0);
        make_line(bottom_left_line,target_buffer,line_num,1);
        make_line(bottom_line,target_buffer,line_num,2);
        make_line(bottom_right_line,target_buffer,line_num,3);
        make_line(center_line,target_buffer,line_num,4);
    }
    function make_7(target_buffer){
        var line_num = 3;
        make_line(upper_line,target_buffer,line_num,0);
        make_line(upper_right_line,target_buffer,line_num,1);
        make_line(bottom_right_line,target_buffer,line_num,2);
    }
    function make_8(target_buffer){
        var line_num = 7;
        make_line(upper_line,target_buffer,line_num,0);
        make_line(upper_right_line,target_buffer,line_num,1);
        make_line(bottom_right_line,target_buffer,line_num,2);
        make_line(bottom_line,target_buffer,line_num,3);
        make_line(bottom_left_line,target_buffer,line_num,4);
        make_line(upper_left_line,target_buffer,line_num,5);
        make_line(center_line,target_buffer,line_num,6);
    }
    function make_9(target_buffer){
        var line_num = 5;
        make_line(center_line,target_buffer,line_num,0);
        make_line(upper_left_line,target_buffer,line_num,1);
        make_line(upper_line,target_buffer,line_num,2);
        make_line(upper_right_line,target_buffer,line_num,3);
        make_line(bottom_right_line,target_buffer,line_num,4);
    }

    function make_line(point,buffer,step,count){
        var start = point[0];
        var vec = [point[1][0] - start[0],point[1][1] - start[1]];
        for(var i=count*2;i<buffer.length;i+=step*2){
            buffer[i] = start[0] + vec[0]/buffer.length * i;
            buffer[i+1] = start[1] + vec[1]/buffer.length * i;
        }
    }
})();
