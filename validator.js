var avail=false;
var codeAvail=false;
function validate(tag)
{
    //alert(tag);
	if(tag.value=="" || tag.value==null)
	{
		document.getElementById(tag.name).innerHTML=tag.getAttribute("temp")+"<br>";
		return false;
	}
	else
	{
		document.getElementById(tag.name).innerHTML="";
		return true;
	}
}

function validate1(tag)
{
	if(tag.value=="" || tag.value==null)
	{
		document.getElementById(tag.name).innerHTML=tag.getAttribute("temp")+"<br>";
		return false;
	}
	else
	{
		document.getElementById(tag.name).innerHTML="";
		return true;
	}
}

function validate2(tag)
{
	if(tag.value=="" || tag.value==null)
	{
		document.getElementById(tag.name).innerHTML=tag.getAttribute("temp")+"<br>";
		return false;
	}
	else
	{
		document.getElementById(tag.name).innerHTML="";
		return true;
	}
}

function validator(tag)
{
 //alert("DSFGSFG");
	if(tag.value=="Select")
	{
            document.getElementById(tag.name).innerHTML=tag.getAttribute("temp")+"<br>";         
		return false;
	}
	else
	{
            document.getElementById(tag.name).innerHTML="";
		return true;
	}
}

function validator1(tag)
{
	if(tag.value=="Select")
	{
		document.getElementById(tag.name).innerHTML=tag.getAttribute("temp")+"<br>";
		return false;
	}
	else
	{
		document.getElementById(tag.name).innerHTML="";
		return true;
	}
}

function validator2(tag)
{
	if(tag.value=="Select" || tag.value=="" || tag.value==null)
	{
		document.getElementById(tag.name).innerHTML=tag.getAttribute("temp")+"<br>";
		return false;
	}
	else
	{
		document.getElementById(tag.name).innerHTML="";
		return true;
	}
}

function validator3(tag)
{
    
	if(tag.value=="Select" || tag.value=="" || tag.value==null)
	{
		document.getElementById(tag.name).innerHTML=tag.getAttribute("temp")+"<br>";
		return false;
	}
	else
	{
		document.getElementById(tag.name).innerHTML="";
		return true;
	}
}

function validator4(tag)
{
	if(tag.value=="Select" || tag.value=="" || tag.value==null)
	{
		document.getElementById(tag.name).innerHTML=tag.getAttribute("temp")+"<br>";
		return false;
	}
	else
	{
		document.getElementById(tag.name).innerHTML="";
		return true;
	}
}
function validator5(tag)
{
	if(tag.value=="Select" || tag.value=="" || tag.value==null)
	{
		document.getElementById(tag.name).innerHTML=tag.getAttribute("temp")+"<br>";
		return false;
	}
	else
	{
		document.getElementById(tag.name).innerHTML="";
		return true;
	}
}

function lengthValidate(tag,component,min,max)
{
	if(!(tag.value.length>=min && tag.value.length<=max))
	{
		document.getElementById(tag.name).innerHTML=component+" must be atleast of "+min+" characters and atmost "+max+" characters.<br>";
		return false;
	}
	else
	{
		document.getElementById(tag.name).innerHTML="";
		return true;
	}
}

function numberValidator(tag)
{
	if(tag.value=="" || !isValidNumber(tag.value) || tag.value.length!=10)
	{
		document.getElementById(tag.name).innerHTML=tag.getAttribute("temp")+"<br>";
		return false;
	}
	else
	{
		document.getElementById(tag.name).innerHTML="";
		return true;
	}
}

function isValidNumber(e)
{
	return parseInt(e+"")==e;
}

function passValidate(tag)
{
	if(document.getElementById('pass-one').value!=tag.value )
	{
		document.getElementById(tag.name).innerHTML="Password do not match.<br>";
		tag.value="";
		document.getElementById('pass-one').value="";
		return false;
	}
	else
	{
		document.getElementById(tag.name).innerHTML="";
		return true;
	}
}

function emailValidator(tag)
{
	mail=tag.value;
	var atpos=mail.indexOf("@");
	var dotpos=mail.lastIndexOf(".");
	if (atpos<1 || dotpos<atpos+2 || dotpos+2>=mail.length)
	{
		document.getElementById(tag.name).innerHTML=tag.getAttribute("temp")+"<br>";
		return false;
	}
	else
	{
		document.getElementById(tag.name).innerHTML="";
		return true;
	}
}

function validFile(tag)
{
	files=tag.value;
	var m=files.split(".");
	if((files=="") || (files==null) || (!((m[1]== "doc") || (m[1]== "docx") || (m[1]== "pdf"))))
	{
		document.getElementById(tag.name).innerHTML=tag.getAttribute("temp")+"<br>";
		return false;
	}
	else
	{
		document.getElementById(tag.name).innerHTML="";
		return true;
	}
	
}

function validateAll()
{
	try
	{
	var p1=validate(document.getElementById('input-name'));
	var p2=validate1(document.getElementById('datepicker'));
	var p3=validate2(document.getElementById('input-address'));
	var p4=validator(document.getElementById('input-gender'));
	var p5=validator1(document.getElementById('stateDrop'));
	var p6=validator2(document.getElementById('cityDrop'));
	var p7=validator3(document.getElementById('input-branch'));
	var p8=lengthValidate(document.getElementById('pass-one'),'Password',8,16);
	var p9=numberValidator(document.getElementById('input-number'));
	var p10=passValidate(document.getElementById('input-repassword'));
	var p11=emailValidator(document.getElementById('input-email'));
	
	var p13=validator4(document.getElementById('input-category'));
	var p14=validator5(document.getElementById('input-minority'));
	return p1&&p2&&p3&&p4&&p5&&p6&&p7&&p8&&p9&&p10&&p11&&p13&&p14;
	}
	catch(e){alert(e);}
}




function validateFeedback(){
    try{
        var p1=validator(document.getElementById('feedback_type'));
	    var p2=validator(document.getElementById('answer_type'));
        var p2=validator(document.getElementById('academic_year'));
        return p1&&p2;
    }catch(e){
        alert(e);
    }
    
}



function validate_key(key)
{
                //getting key code of pressed key
                var keycode = (key.which) ? key.which : key.keyCode;
                var phn = document.getElementById('amount');
                //comparing pressed keycodes
                if (!(keycode==8 || keycode==46)&&(keycode < 48 || keycode > 57))
                {
                return false;
                }
                else
                {
                //Condition to check textbox contains ten numbers or not
                if (phn.value.length <10)
                {
                return true;
                }
                else
                {
                return false;
                }
                }
}




function validate_textarea(tag)
{
  var empty = tag.value;
   //alert(empty);
    if(empty.length<1)
	{
		document.getElementById(tag.name).innerHTML=tag.getAttribute("temp")+"<br>";
		return false;
	}
	else
	{
		document.getElementById(tag.name).innerHTML="";
		return true;
	}
    
    
}