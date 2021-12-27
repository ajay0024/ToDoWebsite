from flask_wtf import FlaskForm
from wtforms import StringField, SubmitField, PasswordField, EmailField, HiddenField
from wtforms.validators import DataRequired, Length


##WTForm
class RegisterForm(FlaskForm):
    email = EmailField("Email", validators=[DataRequired()])
    password = PasswordField("Password", validators=[DataRequired(), Length(min=6, max=100)])
    name = StringField("Name", validators=[DataRequired()])
    tasklist_id = HiddenField("TasklistId", validators=[DataRequired()])


class LoginForm(FlaskForm):
    email = StringField("Email", validators=[DataRequired()])
    password = PasswordField("Password", validators=[DataRequired()])
    tasklist_id = HiddenField("TasklistId", validators=[DataRequired()])
