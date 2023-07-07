if( location.hash.indexOf('doc')!=-1 ){
    var el = document.querySelector('#documentation-tab')
    var tab = new bootstrap.Tab(el);
    tab.show()
}

 var obj = null
                    var info_sections = null
                    var nav = null
                    
                    var set_keygpt = () => {
                        var key = (localStorage.GPT_API_key==null) ? keygpt.value : localStorage.GPT_API_key
                        
                        if(key==''){
                            key='none'
                            warning.innerHTML="As you did not provide, the gpt functions are disabled"
                            warning.style.color = "#E34928"
                            go_gpt.disabled=true
                            container_answer_gpt.style.display='none'
                        }
                        else{
                            warning.innerHTML="Key provided!"
                            warning.style.color = "#2842E3"
                            go_gpt.disabled=false
                            container_answer_gpt.style.display=''
                        }
                        localStorage.GPT_API_key = key
                        
                        return key
                    }
                    
                    
                    var change_agent = () => {
                        var sub_chosen = agent.value
                        var html_secs = nav[sub_chosen].map(e => `<option value="${e.replace(' - Page ','_')}" >${e}</option>`)
                        sections.innerHTML = html_secs.join('')
                        var sec_chosen = nav[sub_chosen].filter(e => e.toLowerCase().indexOf('evaluation')!=-1 )
                        
                        if(sec_chosen.length>0){
                            sec_chosen=sec_chosen.slice(-1)[0].replace(' - Page ','_')
                            sections.value=sec_chosen
                        }
                        
                        change_section()
                        
                    }
                    
                    var change_section = () => {
                        var sub_chosen = agent.value
                        var sec_chosen = sections.value
                        
                        var all_context = info_sections[sub_chosen].filter(e => e.name==sec_chosen.split('_')[0] && e.page_start==sec_chosen.split('_')[1] )[0].content.join('.')
                        context.value = all_context
                    }
                    
                    var init_use_case = () => {
                        let key = set_keygpt()
                        
                        go_bert.value="Wait ..."
                        go_bert.disabled=true
                        
                        go_wink.value="Wait ..."
                        go_wink.disabled=true
                        
                        if( localStorage.GPT_API_key != "none"){
                            go_gpt.value="Wait ..."
                            go_gpt.disabled=true
                        }
                        
                        notice.style.display=""
                        
                        SurvC2Init( key ).then( async v => {
                            obj = v
                            console.log(obj)
                            
                            var subs = ['Tobacco smoking', 'Opium consumption']
                            
                            var calls = []
                            for(var k of subs){
                                calls.push( survc2.loadMonograph( obj.validated[k] ) )
                            }
                            var dat = await Promise.all( calls )
                            
                            var cases = {}
                            var i=0
                            info_sections = {}
                            nav = {}
                            for(var k of subs){
                                cases[k] = dat[i]
                                info_sections[k] = survc2.get_header_sections( cases[k] )
                                nav[k] = info_sections[k].map(e => e.name+' - Page '+e.page_start)
                                i+=1
                            }
                            
                            change_agent()
                            
                            //fill_agents() 
                            
                            question.value="Is there evidence for the carcinogenicity of opium consumption?"
                            
                            await answer_wink()
                            await answer_tfjs()
                            
                            go_bert.value="Ask (BERT)"
                            go_bert.disabled=false
                            
                            go_wink.value="Ask (wink)"
                            go_wink.disabled=false
                            
                            if( localStorage.GPT_API_key != "none"){
                                await answer_gpt()
                                
                                go_gpt.value="Ask (GPT)"
                                go_gpt.disabled=false
                            }
                            
                            notice.style.display="none"
                       })
                    }
                    init_use_case()
                    
                    var fill_agents = () => {
                        var sub_chosen = agent.value
                        var sections = info_sections[sub_chosen].filter(e => e.name.includes('evaluation'))
                        var agents = survc2.get_agents_from_nlp( sections )
                        console.log(agents)
                        var htmls = ""
                        agents.forEach( e => { htmls+=`<span class="badge bg-primary mr mb-2"> ${e} </span>` } )
                        if(htmls!=""){
                            container_agents.style.display=""
                            agents_nlp.innerHTML=htmls
                        }
                        
                    }
                    
                    var answer_all = async () => {
                        await answer_wink()
                        await answer_tfjs()
                        if( localStorage.GPT_API_key != "none"){
                            await answer_gpt()
                        }
                    }
                    
                    var answer_wink = async () => {
                        go_wink.value="Wait ..."
                        go_wink.disabled=true
                        
                        var q = question.value
                        var text = context.value.split('.')
                        
                        var ans_html = "No answer found"
                        if(q && text){
                            var res = await survc2.get_wink_answers(q, text)
                            
                            if(res.length > 0){
                                ans_html="Most probable answers:\n"
                                var i=0
                                for (var r of res){
                                    ans_html+=`<p> <b>Answer ${i+1}: </b> ${r[2]} - <b>Score:</b> ${r[1]} </p>`
                                    i+=1
                                }
                            }
                        }
                        else{
                            alert('Insert a question and a context text!')
                        }
                        
                        document.querySelector('#container_answer_wink .ans').innerHTML = ans_html
                        
                        go_wink.value="Ask (wink)"
                        go_wink.disabled=false
                    }
                    
                    var answer_tfjs = async () => {
                        go_bert.value="Wait ..."
                        go_bert.disabled=true
                        
                        var q = question.value
                        var text = context.value.split('.')
                        
                        var ans_html = "No answer found"
                        if(q && text){
                            var res = await survc2.get_bert_answers(q, text)
                            
                            if(res.length > 0){
                                ans_html="Most probable answers:\n"
                                var i=0
                                for (var r of res){
                                    ans_html+=`<p> <b>Answer ${i+1} - </b> ${r.text} - <b>Score:</b> ${r.score} </p>`
                                    i+=1
                                }
                            }
                        }
                        else{
                            alert('Insert a question and a context text!')
                        }
                        
                        document.querySelector('#container_answer_bert .ans').innerHTML = ans_html
                        
                        go_bert.value="Ask (BERT)"
                        go_bert.disabled=false
                    }
                    
                    var answer_gpt = async () => {
                        go_gpt.value="Wait ..."
                        go_gpt.disabled=true
                        
                        var q = question.value
                        var text = context.value.split('.')
                        
                        if(q && text){
                            var obj = await survc2.get_gpt_answers(q, text)
                            obj = obj.answer
                            
                            var ans_html = "No answer found"
                            if( obj.choices != null ){
                                if(obj.choices.length > 0 ){
                                    ans_html="Most probable answers:\n"
                                    var i=0
                                    for (var r of obj.choices){
                                        ans_html+=`<p> <b>Answer ${i+1} - </b> ${r.message.content} </p>`
                                        i+=1
                                    }
                                }
                            }
                        }
                        else{
                            alert('Insert a question and a context text!')
                        }
                        
                        document.querySelector('#container_answer_gpt .ans').innerHTML = ans_html
                        
                        go_gpt.value="Ask (GPT)"
                        go_gpt.disabled=false
                    }
