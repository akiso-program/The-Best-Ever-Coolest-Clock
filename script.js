(function(){
    'use strict';

    // variables
    var gl, run, canvas, canvasWidth, canvasHeight;
    var imageWidth, imageHeight;
    var mousePosition, isMousedown, acceleration;
    canvasWidth = 512;
    canvasHeight = 512;
    imageWidth = 256;
    imageHeight = 256;
    let additionalDots = 200;

    var VBOArray = [[],[]];
    var position = [];
    var velocity = [];
    var target = [];

    var devide_target = [];

    var makefunc = [make_0,make_1,make_2,make_3,make_4,make_5,make_6,make_7,make_8,make_9];

    window.addEventListener('load', function(){
        // canvas initialize
        canvas = document.getElementById('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        mousePosition = [0.0, 0.0];
        isMousedown = false;
        acceleration = 0.0;

        // mousemove event
        canvas.addEventListener('mousedown', function(eve){
            isMousedown = true;
        }, false);
        canvas.addEventListener('mouseup', function(eve){
            isMousedown = false;
        }, false);
        canvas.addEventListener('mouseout', function(eve){
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
        if(!gl){
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
                gl.getUniformLocation(prg, 'mousePos'),
                gl.getUniformLocation(prg, 'acceleration'),
                gl.getUniformLocation(prg, 'isMouseDown')
            ];
            
            // feedback in shader
            vs = create_shader('vs_main');
            fs = create_shader('fs_main');
            var fPrg = create_program(vs, fs);
            var fAttStride = [2];
            var fUniLocation = [
                gl.getUniformLocation(fPrg, 'vpMatrix'),
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
                        target.push(0.5,0.0);
                    }
                }
                devide_target.push(target.slice(0,target.length/4));
                devide_target.push(target.slice(target.length/4,target.length/4*2));
                devide_target.push(target.slice(target.length/4*2,target.length/4*3));
                devide_target.push(target.slice(target.length/4*3));
                for(i=0;i<additionalDots;++i){
                    x = rnorm() * 2.0 - 1.0;
                    y = rnorm() * 2.0 - 1.0;
                    m = Math.sqrt(x * x + y * y);
                    position.push(x, -y);
                    velocity.push(x / m, -y / m );
                    target.push(x, -y);
                }
                devide_target.push(target.slice(-additionalDots));
            })();

            // create vbo
            VBOArray = [
                [
                    create_vbo(position),
                    create_vbo(velocity),
                    create_vbo(target)
                ], [
                    create_vbo(position),
                    create_vbo(velocity),
                    create_vbo(target)
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
            var updateTime = Date.now();
            var nowTime = 0;
            var count = 0;
            var lastMouseDown = isMousedown;
            run = true;
            var ambient = [];
            var fstPos,sndPos;
            var autoMove = false;

            render();

            function render(){
                nowTime = (Date.now() - startTime) / 1000;
                let onMouseDown = isMousedown == true && lastMouseDown == false;
                let onMouseUp = isMousedown == false && lastMouseDown == true;
                lastMouseDown = isMousedown;

                if(updateTime + 1500 < Date.now()){
                    acceleration *= 0.98;
                }

                if(updateDate(new Date())){
                    devide_target[4].forEach(e => e = rnorm() * 2.0 - 1.0 );
                    updateVelocity();
                    var tt = devide_target[0].concat(devide_target[1],devide_target[2],devide_target[3],devide_target[4]);
                    VBOArray[0][1] = recreate_vio(VBOArray[0][1],velocity);
                    VBOArray[0][2] = recreate_vio(VBOArray[0][2],tt);
                    VBOArray[1][1] = recreate_vio(VBOArray[1][1],velocity);
                    VBOArray[1][2] = recreate_vio(VBOArray[1][2],tt);
                    updateTime = Date.now();
                    acceleration = 1.0;
                    
                    fstPos = [Math.random() * 2.0 - 1.0,Math.random() * 2.0 - 1.0];
                    sndPos = [Math.random() * 2.0 - 1.0,Math.random() * 2.0 - 1.0];
                }
                if(onMouseDown || onMouseUp){
                    acceleration = 1.0;
                }
                
                // 時間更新後1秒なぞった様に動く
                if(updateTime + 1000 > Date.now()){
                    let time = (Date.now() - updateTime) / 1000;
                    mousePosition = [lerp(fstPos[0],sndPos[0],time),lerp(fstPos[1],sndPos[1],time)];
                    isMousedown = true;
                    autoMove = true;
                }
                // なぞったような動き終了
                if(autoMove && updateTime + 1000 < Date.now()){
                    autoMove = false;
                    lastMouseDown = true;
                    isMousedown = false;
                }

                // increment
                ++count;
                var countIndex = count % 2;
                var invertIndex = 1 - countIndex;
                
		        ambient = hsva(count % 360, 1.0, 0.8, 1.0);

                // program
                gl.useProgram(prg);

                // set vbo
                set_attribute(VBOArray[countIndex], attStride);
                gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, VBOArray[invertIndex][0]);
                gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, VBOArray[invertIndex][1]);

                // begin transform feedback
                gl.enable(gl.RASTERIZER_DISCARD);
                gl.beginTransformFeedback(gl.POINTS);

                // vertex transform
                gl.uniform2fv(uniLocation[0], mousePosition);
                gl.uniform1f(uniLocation[1], acceleration);
                gl.uniform1f(uniLocation[2], isMousedown == true ? 1.0:0.0);
                gl.drawArrays(gl.POINTS, 0, imageWidth * imageHeight + additionalDots);

                // end transform feedback
                gl.disable(gl.RASTERIZER_DISCARD);
                gl.endTransformFeedback();
                gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
                gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, null);
                
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
                gl.uniform4fv(fUniLocation[1], ambient);
                gl.drawArrays(gl.POINTS, 0, imageWidth * imageHeight + additionalDots);

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
        var vbo2 = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo2);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_COPY);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        return vbo2;
    }

    function create_vbo(data){
        var vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_COPY);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        return vbo;
    }
    function set_attribute(vbo, attS){
        for(var i in attS){
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);
            gl.enableVertexAttribArray(i);
            gl.vertexAttribPointer(i, attS[i], gl.FLOAT, false, 0, 0);
        }
    }

    function updateVelocity(){
        for(var i = 0; i < velocity.length; i += 2){
            let y = Math.random()* 2.0 - 1.0;
            let x = Math.random()* 2.0 - 1.0;
            let m = Math.sqrt(x * x + y * y);
            velocity[i] = x/m * 2.0;
            velocity[i+1] = -y/m * 2.0;
        }
    }

    var currentMinute1 = Number.MAX_SAFE_INTEGER ;
    var currentMinute10 = Number.MAX_SAFE_INTEGER;
    var currentHour1 = Number.MAX_SAFE_INTEGER;
    var currentHour10 = Number.MAX_SAFE_INTEGER;
    function updateDate(date){
        return updateMinute(Number(date.getMinutes())) || updateHour(Number(date.getHours()))
    }
    function updateMinute(minute){
        let minute1 = minute%10;
        let minute10 = parseInt(minute/10)%10;
        if(currentMinute1 !== minute1){
            //１の位の更新
            makefunc[minute1](devide_target[0],[0.6,0.0]);
            currentMinute1 = minute1;
            return true;
        }
        if(currentMinute10 !== minute10){
            //１０の位の更新
            makefunc[minute10](devide_target[1],[0.25,0.0]);
            currentMinute10 = minute10;
            return true;
        }
        return false;
    }
    function updateHour(hour){
        let hour1 = hour%10;
        let hour10 = parseInt(hour/10)%10;
        if(currentHour1 !== hour1){
            //１の位の更新
            makefunc[hour1](devide_target[2],[-0.25,0.0]);
            currentHour1 = hour1;
            return true;
        }
        if(currentHour10 !== hour10){
            //１０の位の更新
            makefunc[hour10](devide_target[3],[-0.6,0.0]);
            currentHour10 = hour10;
            return true;
        }
        return false;
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

    function make_0(target_buffer,pos){
        var line_num = 6;
        make_line(upper_line,target_buffer,pos,line_num,0);
        make_line(upper_right_line,target_buffer,pos,line_num,1);
        make_line(bottom_right_line,target_buffer,pos,line_num,2);
        make_line(bottom_line,target_buffer,pos,line_num,3);
        make_line(bottom_left_line,target_buffer,pos,line_num,4);
        make_line(upper_left_line,target_buffer,pos,line_num,5);
    }
    function make_1(target_buffer,pos){
        var line_num = 2;
        make_line(upper_right_line,target_buffer,pos,line_num,0);
        make_line(bottom_right_line,target_buffer,pos,line_num,1);
    }
    function make_2(target_buffer,pos){
        var line_num = 5;
        make_line(upper_line,target_buffer,pos,line_num,0);
        make_line(upper_right_line,target_buffer,pos,line_num,1);
        make_line(center_line,target_buffer,pos,line_num,2);
        make_line(bottom_left_line,target_buffer,pos,line_num,3);
        make_line(bottom_line,target_buffer,pos,line_num,4);
    }
    function make_3(target_buffer,pos){
        var line_num = 5;
        make_line(upper_line,target_buffer,pos,line_num,0);
        make_line(upper_right_line,target_buffer,pos,line_num,1);
        make_line(center_line,target_buffer,pos,line_num,2);
        make_line(bottom_right_line,target_buffer,pos,line_num,3);
        make_line(bottom_line,target_buffer,pos,line_num,4);
    }
    function make_4(target_buffer,pos){
        var line_num = 4;
        make_line(upper_right_line,target_buffer,pos,line_num,0);
        make_line(bottom_right_line,target_buffer,pos,line_num,1);
        make_line(upper_left_line,target_buffer,pos,line_num,2);
        make_line(center_line,target_buffer,pos,line_num,3);
    }
    function make_5(target_buffer,pos){
        var line_num = 5;
        make_line(upper_line,target_buffer,pos,line_num,0);
        make_line(upper_left_line,target_buffer,pos,line_num,1);
        make_line(center_line,target_buffer,pos,line_num,2);
        make_line(bottom_right_line,target_buffer,pos,line_num,3);
        make_line(bottom_line,target_buffer,pos,line_num,4);
    }
    function make_6(target_buffer,pos){
        var line_num = 5;
        make_line(upper_left_line,target_buffer,pos,line_num,0);
        make_line(bottom_left_line,target_buffer,pos,line_num,1);
        make_line(bottom_line,target_buffer,pos,line_num,2);
        make_line(bottom_right_line,target_buffer,pos,line_num,3);
        make_line(center_line,target_buffer,pos,line_num,4);
    }
    function make_7(target_buffer,pos){
        var line_num = 3;
        make_line(upper_line,target_buffer,pos,line_num,0);
        make_line(upper_right_line,target_buffer,pos,line_num,1);
        make_line(bottom_right_line,target_buffer,pos,line_num,2);
    }
    function make_8(target_buffer,pos){
        var line_num = 7;
        make_line(upper_line,target_buffer,pos,line_num,0);
        make_line(upper_right_line,target_buffer,pos,line_num,1);
        make_line(bottom_right_line,target_buffer,pos,line_num,2);
        make_line(bottom_line,target_buffer,pos,line_num,3);
        make_line(bottom_left_line,target_buffer,pos,line_num,4);
        make_line(upper_left_line,target_buffer,pos,line_num,5);
        make_line(center_line,target_buffer,pos,line_num,6);
    }
    function make_9(target_buffer,pos){
        var line_num = 5;
        make_line(center_line,target_buffer,pos,line_num,0);
        make_line(upper_left_line,target_buffer,pos,line_num,1);
        make_line(upper_line,target_buffer,pos,line_num,2);
        make_line(upper_right_line,target_buffer,pos,line_num,3);
        make_line(bottom_right_line,target_buffer,pos,line_num,4);
    }

    function make_line(point,buffer,pos,step,count){
        var start = point[0];
        var vec = [point[1][0] - start[0],point[1][1] - start[1]];
        for(var i=count*2;i<buffer.length;i+=step*2){
            buffer[i] = start[0] + vec[0]/buffer.length * i + pos[0];
            buffer[i+1] = start[1] + vec[1]/buffer.length * i + pos[1];
        }
    }

    // 正規分布にでのランダム生成
    function rnorm() {
        var value =
          Math.sqrt(-2.0 * Math.log(Math.random())) *
          Math.sin(2.0 * Math.PI * Math.random());
        // 値を0以上1未満になるよう正規化する
        value = (value + 3) / 6;
        return value;
    }
    
    // 線形補間
    function lerp(a, b, t) {
        if(b == a) return a;
        return a + t * (b - a);
    }
})();
